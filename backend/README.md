We use `uv` to manage Python dependencies.

# Setup
Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and run:

```
cd backend
uv sync
```

To add dependencies:

```
uv add [package 1] [package 2]
```

# Local run
Start the API locally with:

```
uv run uvicorn main:app --reload
```

# Render deployment
The repo includes a root `render.yaml` blueprint for backend + Postgres.

1. Push this repo to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select this repository and apply the blueprint.
4. Set `FRONTEND_URL` to your deployed frontend URL.
5. Deploy.

The backend service uses:
- Build command: `pip install .`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health endpoint: `/health`

Required environment variables are documented in `backend/.env.example`.
