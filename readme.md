## Docker

The repository now ships with production-ready Docker images for both apps.

```bash
docker compose build    # builds backend + frontend
docker compose up       # starts FastAPI on :8000 and Next.js on :3000
```

The frontend now separates the API URLs it uses internally vs. what the browser sees:

- `API_INTERNAL_BASE_URL`: address reachable **from the Next.js container** (defaults to `http://backend:8000` when running with Compose).
- `NEXT_PUBLIC_API_BASE_URL`: public URL exposed to browsers (defaults to `http://localhost:8000` in Compose so the host machine forwards traffic to the backend container).

When deploying elsewhere, point both variables to the right hosts before building the frontend image (e.g. `API_INTERNAL_BASE_URL=http://backend:8000` and `NEXT_PUBLIC_API_BASE_URL=https://api.example.com`).
