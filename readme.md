# Live LleidaHack 2025

## Variables d'entorn

### Backend (`backend/.env`)

| Variable | Propòsit | Valor per defecte |
| --- | --- | --- |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Credencials per al panell d'alertes (`/notifications/admin/login`) | `admin` / `hackeps2025` |
| `ADMIN_TOKEN_TTL_MINUTES` | Durada del token del panell | `120` |
| `APP_TIMEZONE` | TZ pel temporitzador | `Europe/Madrid` |
| `HACKATHON_START` / `HACKATHON_END` | Franja oficial del hacking (ISO 8601) | Vegeu `.env.example` |
| `REAL_DATA_RELEASE` | Moment en què `shedule.real.json` substitueix `shedule.fake.json` | = `HACKATHON_START` |

### Frontend (`frontend/live-page/.env.local`)

| Variable | Propòsit |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | URL que veu el navegador (ha d’apuntar al domini públic del backend). |
| `API_INTERNAL_BASE_URL` | URL que pot resoldre el servidor Next.js (durant SSR o en Docker Compose sol ser `http://backend:8000`). |
| `NEXT_PUBLIC_TWITCH_PARENT` | Llista de dominis separats per comes permesos per Twitch Embed. |

## Local deploy

1. **Backend**
   ```bash
   cd backend
   uv sync          
   uv run uvicorn main:app --reload --port 8000
   ```
   Visita `http://localhost:8000/docs` per provar els endpoints.

2. **Frontend**
   ```bash
   cd frontend/live-page
   pnpm install      
   pnpm dev          
   ```
   Assegura’t que `NEXT_PUBLIC_API_BASE_URL` i `API_INTERNAL_BASE_URL` apunten al backend local (`http://localhost:8000`).


## Docker 


```bash
docker compose build    
docker compose up -d    
```
