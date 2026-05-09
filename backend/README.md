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
- **Windows `WinError 10013` on port 8000** — Another process may be using the port, or Windows has reserved it. Try: `uv run uvicorn main:app --reload --host 127.0.0.1 --port 8001` and set `VITE_API_BASE_URL=http://127.0.0.1:8001` in `client/.env`.

### Client

Point `client/.env` at the same host/port, e.g. `VITE_API_BASE_URL=http://127.0.0.1:8000`, then restart `npm run dev`.
