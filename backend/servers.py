"""Management of registered remote servers (dashboard backends on other devices).

Each remote server is an instance of the backend found in this project (same /api/... endpoints,
same X-API-Key authentication). The hub backend makes requests to these servers
on behalf of the browser; thus, remote API keys are never sent to the browser."""

import json
import os
import re
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

LOCAL_SERVER_ID = "local"

DATA_DIR = Path(os.environ.get("DASHBOARD_DATA_DIR", "./data"))
SERVERS_FILE = DATA_DIR / "servers.json"

_lock = threading.Lock()

# Only these endpoints are forwarded to the remote server (requests for other paths are rejected).
ALLOWED_PATH = re.compile(
    r"^(system|docker|docker/[^/]+/(start|stop|restart|logs|stats))$"
)


class ServerError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _read_all() -> list[dict]:
    if not SERVERS_FILE.exists():
        return []
    try:
        data = json.loads(SERVERS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def _write_all(servers: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = SERVERS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(servers, indent=2), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    tmp.replace(SERVERS_FILE)


def public_view(server: dict) -> dict:
    """A version ready to be sent to the browser without the API key."""
    return {
        "id": server["id"],
        "name": server["name"],
        "url": server.get("url", ""),
        "is_local": server["id"] == LOCAL_SERVER_ID,
    }


def local_server() -> dict:
    return {"id": LOCAL_SERVER_ID, "name": "This server", "url": ""}


def list_servers() -> list[dict]:
    with _lock:
        return _read_all()


def get_server(server_id: str) -> dict | None:
    for server in list_servers():
        if server["id"] == server_id:
            return server
    return None


def normalize_url(raw: str) -> str:
    url = raw.strip().rstrip("/")
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ServerError(
            422, "URL must start with http:// or https:// and include a host."
        )
    return url


def add_server(name: str, url: str, api_key: str) -> dict:
    name = name.strip()
    api_key = api_key.strip()
    if not name or len(name) > 40:
        raise ServerError(422, "Name is required (max 40 characters).")
    if not api_key:
        raise ServerError(422, "API key is required.")
    url = normalize_url(url)

    with _lock:
        servers = _read_all()
        if any(s["url"].lower() == url.lower() for s in servers):
            raise ServerError(409, "A server with this URL is already added.")
        server = {
            "id": uuid.uuid4().hex[:10],
            "name": name,
            "url": url,
            "api_key": api_key,
        }
        servers.append(server)
        _write_all(servers)
    return server


def delete_server(server_id: str) -> bool:
    with _lock:
        servers = _read_all()
        remaining = [s for s in servers if s["id"] != server_id]
        if len(remaining) == len(servers):
            return False
        _write_all(remaining)
    return True


def _error_detail(exc: urllib.error.HTTPError) -> str:
    try:
        body = json.loads(exc.read().decode("utf-8"))
        detail = body.get("detail")
        if isinstance(detail, str) and detail:
            return detail
    except (ValueError, OSError, AttributeError):
        pass
    return f"Remote server returned HTTP {exc.code}."


def remote_request(
    server: dict,
    method: str,
    path: str,
    timeout: float = 5.0,
):
    """It sends a request to the `/api/<path>` endpoint of the remote server and returns JSON."""
    if not ALLOWED_PATH.match(path):
        raise ServerError(404, "Unsupported path.")

    segments = path.split("/")
    safe_path = "/".join(urllib.parse.quote(part, safe="") for part in segments)
    request = urllib.request.Request(
        f"{server['url']}/api/{safe_path}",
        method=method,
        data=b"" if method == "POST" else None,
        headers={
            "X-API-Key": server["api_key"],
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise ServerError(
                502,
                f"'{server['name']}' rejected the API key. "
                "Check the key you entered.",
            ) from exc
        status = 404 if exc.code == 404 else 502
        raise ServerError(status, _error_detail(exc)) from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        reason = getattr(exc, "reason", exc)
        raise ServerError(
            504, f"'{server['name']}' is unreachable: {reason}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise ServerError(
            502, f"'{server['name']}' returned an invalid response."
        ) from exc
