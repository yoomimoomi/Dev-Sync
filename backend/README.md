We will be using uv to manage python dependencies
# Setup
Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and navigate to the backend directory in the terminal. Run uv sync
```
cd backend
uv sync
```
To add additional dependencies as necessary, use 
```uv add 
uv add [package 1] [package 2]
```
To make sure all packages are the same between collaborators, use
```
uv sync
```
# Run

The ASGI app lives in `backend/main.py` as `app`. **Run uvicorn from the `backend` directory** so Python resolves `main` correctly.

```bash
cd backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

From the repo root (without changing directory):

```bash
uv --directory backend run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### If you see `Attribute "app"` or `":app" not found in module "main"`

- **Typo: double colon** — Use **`main:app`** (one colon), not `main::app`. The latter makes uvicorn look for an attribute literally named `:app` and the server will not start.
- **Wrong working directory** — `uvicorn main:app` must be run with cwd = `backend`, or use `uv --directory backend run ...` as above.
- **IDE run configuration** — Application import string must be exactly `main:app`.
- **Database errors on startup** — Ensure `backend/.env` has valid Postgres credentials and the Supabase pooler user format matches `postgres.<project-ref>` when using `*.pooler.supabase.com`.
- **`notifications.read` / `QueryCanceled` on ALTER** — The API no longer runs `ALTER TABLE` at startup (it can time out or block on locks under Supabase). If your database predates the `read` column on `notifications`, run this **once** in the Supabase SQL Editor (or any Postgres client), ideally during low traffic:

  ```sql
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "read" boolean NOT NULL DEFAULT false;
  ```
- **Windows `WinError 10013` on port 8000** — Another process may be using the port, or Windows has reserved it. Try: `uv run uvicorn main:app --reload --host 127.0.0.1 --port 8001` and set `VITE_API_BASE_URL=http://127.0.0.1:8001` in `client/.env`.

### Client

Point `client/.env` at the same host/port, e.g. `VITE_API_BASE_URL=http://127.0.0.1:8000`, then restart `npm run dev`.

### Teammate on another machine (LAN)

1. Run the API on all interfaces: `uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000` (replace `127.0.0.1` with `0.0.0.0`).
2. Run Vite with a reachable host, e.g. `npm run dev -- --host` in `client`.
3. On the teammate’s machine, set `client/.env` to your machine’s LAN IP, e.g. `VITE_API_BASE_URL=http://192.168.1.10:8000`, and open the UI at `http://192.168.1.10:5173` (same origin pattern as in the browser address bar).
4. In `backend/.env`, add **`CORS_ORIGINS`** with that exact UI origin (comma-separated if several), e.g. `CORS_ORIGINS=http://192.168.1.10:5173`. Without this, the browser blocks API calls even though the server is up.

### Supabase Realtime (optional, chat delivery)

The client can subscribe to Postgres `INSERT` on `messages` in addition to the FastAPI WebSocket. Configure:

1. **Backend** — In `backend/.env`, set **`SUPABASE_JWT_SECRET`** to the value from **Supabase Dashboard → Project Settings → API → JWT Secret** (copy only; you do not change that secret). Optionally set **`SUPABASE_JWT_ISS`** if Supabase rejects tokens without an `iss` claim (use the issuer URL Supabase documents for your project). The API exposes **`GET /realtime/token`** (Bearer: your normal login JWT), which returns a short-lived JWT signed with Supabase’s secret for Realtime only. Login still uses **`JWT_SECRET_KEY`** and does not need to match Supabase.
2. **Publication** — In **Database → Publications → `supabase_realtime`**, ensure **`messages`** is included (toggle on), or run the `alter publication … add table` line from [`supabase_realtime_messages.sql`](supabase_realtime_messages.sql). If Realtime → Policies shows **API DISABLED** for `messages`, the table is usually not replicated or RLS/policy setup is incomplete.
3. Run the rest of that SQL file in the Supabase SQL Editor (RLS + `SELECT` policy). If the table is already in the publication, skip the `alter publication` line or ignore the duplicate error.
4. In `client/.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/public key only).

Sending messages, read receipts, and in-app notifications still use `/ws/chat`; Realtime duplicates new message events for cross-tab sync and when the app server is scaled out. If only Realtime is broken, one browser may still get instant updates via WebSocket while another tab or user lags until you fix steps 1–3.
