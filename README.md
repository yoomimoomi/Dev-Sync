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
cp .env.example .env   # then fill in VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

For Supabase Realtime on `messages`, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and in the backend `SUPABASE_JWT_SECRET` (see [backend/README.md](backend/README.md)).

---

## Deploying

The app splits cleanly: the React/Vite frontend goes on Vercel, the FastAPI backend stays on Render (or any always-on host). Vercel's serverless functions are a poor fit for FastAPI here because of WebSockets, SQLAlchemy session lifecycles, and Supabase Realtime.

### Frontend → Vercel

1. Push the repo to GitHub.
2. In Vercel: **Add New Project** → import the repo.
3. **Root Directory**: `client` (Vercel will auto-detect Vite once this is set).
4. **Environment Variables** (Production + Preview):
   - `VITE_API_BASE_URL` → `https://<your-render-service>.onrender.com`
   - `VITE_SUPABASE_URL` → `https://<project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` → Supabase anon key
5. Deploy. Build command, output directory, and SPA rewrites come from [`client/vercel.json`](client/vercel.json).

### Backend → Render

[`render.yaml`](render.yaml) declares the service. After the first deploy, in the Render dashboard set:

- `FRONTEND_URL` → your production frontend URL (e.g. `https://dev-sync-55mh.onrender.com/`).
- `CORS_ORIGINS` → comma-separated origins, e.g. `https://dev-sync-55mh.onrender.com/`. Localhost dev origins are always included.
- `CORS_ORIGIN_REGEX` (optional) → allow Vercel preview URLs:
  `^https://dev-sync-[a-z0-9-]+-<your-vercel-scope>\.vercel\.app$`
- `SUPABASE_JWT_SECRET` (if using Supabase Realtime).
- `JWT_SECRET_KEY` and `DATABASE_URL` are wired automatically by `render.yaml`.

After both are deployed, hard-refresh the Vercel site and verify the network tab shows `VITE_API_BASE_URL` pointing at the Render origin.
