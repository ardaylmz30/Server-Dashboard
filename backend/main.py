import os
import sys

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import docker
import psutil

load_dotenv()

from docker_manager import (
    get_containers,
    start_container,
    stop_container,
    restart_container,
    get_container_logs,
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


@app.get(
    "/api/system",
    dependencies=[Depends(require_api_key)],
)
def get_system_info():
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "ram": psutil.virtual_memory().percent,
        "ram_total_gb": round(
            psutil.virtual_memory().total / (1024 ** 3),
            1,
        ),
        "disk": psutil.disk_usage("/").percent,
    }


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