# Server Dashboard

Small full-stack app for monitoring host system resources (CPU/RAM/disk) and
managing Docker containers from a web UI.

- **Frontend**: React 19 + TypeScript + Vite + Recharts
- **Backend**: FastAPI + Uvicorn + psutil + Docker SDK
<<<<<<< HEAD
- **Windows host metrics agent**: PowerShell (Windows host CPU/RAM/C: disk)
=======
>>>>>>> 6efa73d05c972ef1197a6d88dccd3c49f2239d5b

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

Environment variables (all optional for local development):

| Variable               | Default                   | Purpose                                                                 |
|-------------------------|----------------------------|--------------------------------------------------------------------------|
| `DASHBOARD_API_KEY`     | unset (no auth)           | When set, Docker start/stop/restart/logs endpoints require an `X-API-Key` header with this value. **Set this before exposing the backend beyond localhost.** |
| `DASHBOARD_CORS_ORIGINS`| `http://localhost:5173`   | Comma-separated list of allowed frontend origins.                       |

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Environment variables (`frontend/.env`):

| Variable         | Default                  | Purpose                                       |
|-------------------|---------------------------|------------------------------------------------|
| `VITE_API_URL`    | `http://127.0.0.1:8000`   | Backend base URL.                              |
| `VITE_API_KEY`    | unset                     | Must match the backend's `DASHBOARD_API_KEY`, if set. |

## Production checklist

1. Set `DASHBOARD_API_KEY` on the backend and `VITE_API_KEY` on the frontend to the same value.
2. Set `DASHBOARD_CORS_ORIGINS` to your real frontend domain(s).
3. Build the frontend with `npm run build` and serve the `dist/` folder from a static host or reverse proxy.
4. Run the backend behind a process manager (e.g. systemd, Docker) rather than `--reload`.

<<<<<<< HEAD
## Docker on Windows

When the application is started with `start.bat`, the FastAPI backend runs in Docker while a small Windows host metrics agent (`host-agent/host_metrics.ps1`) runs on the Windows machine, listening on `http://localhost:8765`. The `/api/system` endpoint reads CPU, RAM and C: disk usage from this agent rather than from the Linux backend container. `start.bat` runs the agent inside a small restart loop, so if it ever exits it relaunches automatically instead of leaving the dashboard without host metrics.

Use `start.bat` to start the dashboard and `stop.bat` to stop it.

### Starting manually from a terminal

If you run `docker compose up` directly instead of using `start.bat`, the agent is **not** started for you — you need to start it yourself first, in its own terminal:

```powershell
cd host-agent
powershell -NoProfile -ExecutionPolicy Bypass -File host_metrics.ps1
```

Leave that window open, then run `docker compose up` in a second terminal. Without the agent running, `/api/system` will return `503 Service Unavailable` (the Docker containers themselves and `/api/docker` are unaffected, since they don't depend on the agent).

### Troubleshooting `/api/system` 503s

- **A handful of 503s only at startup, then steady 200s** — normal. The backend starts polling before the agent finishes opening its TCP listener; it self-resolves within a second or two.
- **503s that never stop** — the agent isn't reachable. Check that:
  - the `host_metrics.ps1` window is still open and running (`netstat -ano | findstr 8765` should show a `LISTENING` entry);
  - Windows Firewall hasn't blocked the script on first run;
  - if it crashed, restart it manually (`start.bat` does this automatically going forward).

=======
>>>>>>> 6efa73d05c972ef1197a6d88dccd3c49f2239d5b
## Screenshots
[Server Dashboard Screenshot](Screenshots/Server-Dashboard.png)

[Docker Screenshot](Screenshots/Docker.png)
## Project structure

```
backend/
  main.py            # FastAPI app, routes, CORS, auth
  docker_manager.py  # Docker SDK operations
  requirements.txt

frontend/
  src/
    api/dashboardApi.ts  # All backend HTTP calls + shared types
    App.tsx               # UI, state, polling
    App.css
```

As the codebase grows, split `App.tsx`'s UI pieces into `components/` and keep
`App.tsx` as the orchestration/state layer — no need for Redux, React Query, or
<<<<<<< HEAD
similar until that complexity actually shows up.
=======
similar until that complexity actually shows up.
>>>>>>> 6efa73d05c972ef1197a6d88dccd3c49f2239d5b
