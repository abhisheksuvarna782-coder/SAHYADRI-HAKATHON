# RouteRecover AI deployment

## Architecture

Deploy the Vite frontend to Vercel and the FastAPI backend to a separate Python
service. The backend is not configured as a Vercel Function, and its SQLite
database must not be stored on a serverless filesystem. The backend supports a
persistent PostgreSQL database using the `postgresql+psycopg://` SQLAlchemy URL.

SQLite remains the default for local development. Production configuration
rejects SQLite so that data is not accidentally stored on an ephemeral disk.

## Run locally (Windows)

From the repository root, install and run the frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

In a second terminal, configure and start the backend:

```powershell
Set-Location backend
if (!(Test-Path .env)) { Copy-Item ..\.env.example .env }
if (!(Test-Path .venv)) { py -m venv .venv }
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\seed_db.py
uvicorn app.main:app --reload
```

The frontend uses the Vite `/api` proxy to `http://localhost:8000` when
`VITE_API_BASE_URL` is not set. The API health check is available at
`http://localhost:8000/api/health`.

## Deploy the backend

Use a persistent Python service with the `backend` directory as its working
directory. Install dependencies with `pip install -r requirements.txt` and
start the service with:

```sh
uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

Configure these server-side environment variables:

| Variable | Production value |
| --- | --- |
| `APP_ENV` | `production` |
| `DEBUG` | `false` |
| `SECRET_KEY` | A unique, randomly generated value; never commit it |
| `DATABASE_URL` | A persistent PostgreSQL URL, e.g. `postgresql+psycopg://DB_USER:DB_PASSWORD@DB_HOST:5432/routerecover` |
| `CORS_ORIGINS` | The exact deployed frontend origin(s), comma-separated |
| `AI_PROVIDER` | `none`, `openai`, or `anthropic` |
| `OPENAI_API_KEY` | Set only when using OpenAI; server-side only |
| `ANTHROPIC_API_KEY` | Set only when using Anthropic; server-side only |

The service creates missing tables on startup. Configure a persistent database
before starting production; do not copy the local `routerecover.db` into a
serverless deployment. Database credentials and AI keys belong only in the
backend service's secret/environment settings.

If the deployed application should include the sample demo trip, run
`python scripts/seed_db.py` once from the backend directory with the same
production environment. The seed script is repeatable; do not run it if you do
not want sample records in production.

## Deploy the frontend to Vercel

1. Import the repository and set the Vercel project root directory to
   `frontend`.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Add `VITE_API_BASE_URL` as a Vercel environment variable for Production, with
   the deployed backend URL ending in `/api` (for example,
   `https://routerecover-api.example.com/api`).
4. Deploy. `frontend/vercel.json` rewrites client-side routes to `index.html`;
   the Axios API client sends requests directly to the configured backend.

`VITE_API_BASE_URL` is public frontend configuration, not a place for secrets.
Never put database credentials, `SECRET_KEY`, or AI provider keys in a `VITE_*`
variable.

## Verify the deployment

Open the deployed frontend at `/`, then refresh `/dashboard` and a nested route
such as `/recovery/<plan-id>` to verify SPA routing. Confirm that the deployed
backend responds successfully at `/api/health`, and run the demo scenario only
after seeding the intended demo data. Demo bookings and approvals remain
simulations and do not perform provider transactions.
