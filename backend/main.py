import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from anomaly_engine import monitor
from environment_monitor import env_monitor
from notifier import send_email_alert, send_telegram_alert
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Path, Request
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import docker
import psutil

load_dotenv()

import servers as registry
from docker_manager import (
    get_containers,
    start_container,
    stop_container,
    restart_container,
    get_container_logs,
    get_container_stats,
)


app = FastAPI(title="Server Dashboard API")


allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "DASHBOARD_CORS_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if origin.strip()
]

if "*" in allowed_origins:
    raise RuntimeError(
        "DASHBOARD_CORS_ORIGINS içinde '*' kullanılamaz."
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_KEY = os.environ.get("DASHBOARD_API_KEY")

if not API_KEY:
    sys.exit(
        "[server-dashboard] HATA: DASHBOARD_API_KEY tanımlı değil. "
        "Güvenlik nedeniyle uygulama başlatılmıyor."
    )


def require_api_key(
    x_api_key: str | None = Header(
        default=None,
        alias="X-API-Key",
    ),
):
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key.",
        )


@app.get("/")
def root():
    return {"message": "Server Dashboard API is running!"}


HOST_METRICS_URL = os.environ.get(
    "HOST_METRICS_URL",
    "",
).rstrip("/")


_cpu_lock = threading.Lock()
_cpu_sample = (0.0, 0.0)  # (zaman, değer)


def read_cpu_percent() -> float:
    """psutil.cpu_percent(interval=None) iki çağrı arasındaki farkı ölçer.

    Sistem sorgusu ve sunucu durum sorgusu aynı anda çağırınca çok kısa
    aralıklar anlamsız (ör. %100) değerler üretiyordu; bu yüzden sonuç
    en fazla 1 saniye boyunca önbellekten verilir.
    """
    global _cpu_sample
    with _cpu_lock:
        now = time.monotonic()
        if now - _cpu_sample[0] >= 1.0:
            _cpu_sample = (now, psutil.cpu_percent(interval=None))
        return _cpu_sample[1]


def get_host_metrics():
    if not HOST_METRICS_URL:
        memory = psutil.virtual_memory()
        return {
            "cpu": read_cpu_percent(),
            "ram": memory.percent,
            "ram_total_gb": round(memory.total / (1024 ** 3), 1),
            "disk": psutil.disk_usage("/").percent,
            "source": "backend-container",
        }

    try:
        with urllib.request.urlopen(
            f"{HOST_METRICS_URL}/metrics",
            timeout=1.5,
        ) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Windows host metrics agent unavailable: {exc}",
        ) from exc


@app.get(
    "/api/system",
    dependencies=[Depends(require_api_key)],
)
def get_system_info():
    metrics = get_host_metrics()

    # --- YENİ EKLENEN KISIM: Anomali Kontrolü ---
    try:
        cpu_val = metrics.get("cpu", 0.0)
        # Sistem CPU değerini anomali motoruna işliyoruz
        monitor.process_metric(server_id="local-server", cpu_value=cpu_val)
    except Exception as e:
        print(f"[Anomali Motoru Hatası]: {e}")
    # ---------------------------------------------

    return metrics

@app.get(
    "/api/docker",
    dependencies=[Depends(require_api_key)],
)
def get_docker_info():
    try:
        return get_containers()
    except docker.errors.APIError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Docker API error: {exc.explanation}",
        ) from exc
    except docker.errors.DockerException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Docker is not available on this server: {exc}",
        ) from exc


def handle_docker_action(action, container_name: str):
    try:
        return action(container_name)
    except docker.errors.NotFound as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Container '{container_name}' not found.",
        ) from exc
    except docker.errors.APIError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Docker API error: {exc.explanation}",
        ) from exc


@app.get(
    "/api/alerts",
    dependencies=[Depends(require_api_key)],
)
def get_alerts():
    """Oluşan son CPU anomalilerini ve olayları frontend paneline iletir."""
    return {
        "active_events": list(monitor.active_events.values()),
        "recent_logs": list(monitor.alert_logs)
    }


@app.post(
    "/api/alerts/test",
    dependencies=[Depends(require_api_key)],
)
def test_notifications():
    """E-posta ve Telegram bildirim kanallarını test etmek için suni anomali tetikler."""
    # Normal bir değerle başlatalım
    monitor.process_metric(server_id="test-sunucusu", cpu_value=20.0)
    # Ani bir sıçrama simüle edelim (+30 puan değişim ve yüksek CPU)
    alert_result = monitor.process_metric(server_id="test-sunucusu", cpu_value=55.0)

    return {
        "ok": True,
        "message": "Test anomalisi oluşturuldu. Telegram ve E-posta kontrol edilebilir.",
        "details": alert_result
    }


# ---------------------------------------------------------------------------
# ESP32 ortam sensörleri
# ---------------------------------------------------------------------------

# ESP32'ye ana panel anahtarı yerine ayrı bir anahtar verilebilir.
SENSOR_API_KEY = os.environ.get("SENSOR_API_KEY") or API_KEY


def require_sensor_key(
    x_api_key: str | None = Header(
        default=None,
        alias="X-API-Key",
    ),
):
    if x_api_key != SENSOR_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing sensor API key.",
        )


class SensorReading(BaseModel):
    temperature: float = Field(ge=-40, le=85)
    humidity: float | None = Field(default=None, ge=0, le=100)


@app.post(
    "/api/sensors/{device_id}/readings",
    dependencies=[Depends(require_sensor_key)],
)
def receive_sensor_reading(
    reading: SensorReading,
    device_id: str = Path(pattern=r"^[A-Za-z0-9_-]{1,40}$"),
):
    """ESP32'den gelen sıcaklık/nem ölçümünü alır ve alarm kurallarından geçirir."""
    cpu_hist = monitor.history.get("local-server")
    cpu = cpu_hist[-1] if cpu_hist else None
    return env_monitor.process_reading(
        device_id, reading.temperature, reading.humidity, cpu=cpu
    )


@app.get(
    "/api/sensors",
    dependencies=[Depends(require_api_key)],
)
def get_sensors():
    """Sensörlerin son ölçümleri ve ortam alarmları."""
    return {
        "devices": list(env_monitor.latest.values()),
        "active_events": list(env_monitor.active_events.values()),
        "recent_logs": list(env_monitor.alert_logs)
    }

@app.post(
    "/api/docker/{container_name}/start",
    dependencies=[Depends(require_api_key)],
)
def start_docker_container(container_name: str):
    return handle_docker_action(
        start_container,
        container_name,
    )


@app.post(
    "/api/docker/{container_name}/stop",
    dependencies=[Depends(require_api_key)],
)
def stop_docker_container(container_name: str):
    return handle_docker_action(
        stop_container,
        container_name,
    )


@app.post(
    "/api/docker/{container_name}/restart",
    dependencies=[Depends(require_api_key)],
)
def restart_docker_container(container_name: str):
    return handle_docker_action(
        restart_container,
        container_name,
    )


@app.get(
    "/api/docker/{container_name}/logs",
    dependencies=[Depends(require_api_key)],
)
def docker_container_logs(container_name: str):
    return handle_docker_action(
        get_container_logs,
        container_name,
    )

@app.get(
    "/api/docker/{container_name}/stats",
    dependencies=[Depends(require_api_key)],
)
def docker_container_stats(container_name: str):
    try:
        return get_container_stats(container_name)
    except docker.errors.NotFound as exc:
        raise HTTPException(status_code=404, detail=f"Container '{container_name}' not found.") from exc
    except docker.errors.APIError as exc:
        raise HTTPException(status_code=502, detail=f"Docker API error: {exc.explanation}") from exc



# ---------------------------------------------------------------------------
# Çoklu sunucu desteği
# ---------------------------------------------------------------------------

class ServerPayload(BaseModel):
    name: str
    url: str
    api_key: str


def _raise_http(exc: registry.ServerError):
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@app.get(
    "/api/servers",
    dependencies=[Depends(require_api_key)],
)
def list_registered_servers():
    items = [registry.local_server(), *registry.list_servers()]
    return [registry.public_view(item) for item in items]


@app.post(
    "/api/servers/test",
    dependencies=[Depends(require_api_key)],
)
def test_server_connection(payload: ServerPayload):
    """Kaydetmeden önce URL ve API anahtarını dener."""
    try:
        candidate = {
            "id": "test",
            "name": payload.name.strip() or payload.url,
            "url": registry.normalize_url(payload.url),
            "api_key": payload.api_key.strip(),
        }
        started = time.monotonic()
        metrics = registry.remote_request(candidate, "GET", "system", timeout=5)
    except registry.ServerError as exc:
        _raise_http(exc)
    return {
        "ok": True,
        "latency_ms": round((time.monotonic() - started) * 1000),
        "source": metrics.get("source"),
    }


@app.post(
    "/api/servers",
    dependencies=[Depends(require_api_key)],
    status_code=201,
)
def add_registered_server(payload: ServerPayload):
    try:
        server = registry.add_server(
            payload.name, payload.url, payload.api_key
        )
    except registry.ServerError as exc:
        _raise_http(exc)
    return registry.public_view(server)


@app.delete(
    "/api/servers/{server_id}",
    dependencies=[Depends(require_api_key)],
)
def delete_registered_server(server_id: str):
    if server_id == registry.LOCAL_SERVER_ID:
        raise HTTPException(
            status_code=400, detail="The local server cannot be removed."
        )
    if not registry.delete_server(server_id):
        raise HTTPException(status_code=404, detail="Server not found.")
    return {"message": "Server removed."}


def _check_server_health(server: dict):
    started = time.monotonic()
    try:
        if server["id"] == registry.LOCAL_SERVER_ID:
            metrics = get_host_metrics()
        else:
            metrics = registry.remote_request(
                server, "GET", "system", timeout=2.5
            )
        return server["id"], {
            "online": True,
            "cpu": metrics.get("cpu"),
            "ram": metrics.get("ram"),
            "disk": metrics.get("disk"),
            "latency_ms": round((time.monotonic() - started) * 1000),
        }
    except (HTTPException, registry.ServerError) as exc:
        return server["id"], {"online": False, "error": exc.detail}


@app.get(
    "/api/servers/health",
    dependencies=[Depends(require_api_key)],
)
def servers_health():
    """Tüm sunucuların çevrimiçi durumu ve anlık CPU/RAM/disk özeti."""
    items = [registry.local_server(), *registry.list_servers()]
    with ThreadPoolExecutor(max_workers=min(8, len(items))) as pool:
        return dict(pool.map(_check_server_health, items))


@app.api_route(
    "/api/servers/{server_id}/{path:path}",
    methods=["GET", "POST"],
    dependencies=[Depends(require_api_key)],
)
def proxy_to_server(server_id: str, path: str, request: Request):
    """Uzak sunucudaki /api/<path> ucuna istek iletir."""
    if server_id == registry.LOCAL_SERVER_ID:
        raise HTTPException(
            status_code=400,
            detail="Use the /api/... endpoints for the local server.",
        )

    server = registry.get_server(server_id)
    if server is None:
        raise HTTPException(status_code=404, detail="Server not found.")

    timeout = 30 if request.method == "POST" else 8
    try:
        return registry.remote_request(
            server, request.method, path, timeout=timeout
        )
    except registry.ServerError as exc:
        _raise_http(exc)
