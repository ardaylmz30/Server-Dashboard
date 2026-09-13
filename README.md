# Server Dashboard

Small full-stack app for monitoring host system resources (CPU/RAM/disk) and
managing Docker containers from a web UI.

- **Frontend**: React 19 + TypeScript + Vite + Recharts
- **Backend**: FastAPI + Uvicorn + psutil + Docker SDK

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
similar until that complexity actually shows up.
