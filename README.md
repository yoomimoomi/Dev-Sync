# Dev-Sync

## Backend API

From the repository root:

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Use **`main:app`** with a **single** colon. `main::app` will fail with an ASGI / attribute error.

See [backend/README.md](backend/README.md) for troubleshooting (including the `main:app` / working-directory issue).

## Frontend

```bash
cd client
npm install
npm run dev
```

Use `client/.env` with `VITE_API_BASE_URL` matching your API URL (default `http://localhost:8000`).