### Requisitos previos

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) instalado (`pip install uv` o binario oficial)
- Variables en `.env` (puedes copiar `cp .env.example .env`)

Instala dependencias directamente con uv, que ya crea un entorno aislado:

```bash
cd backend
uv sync  # instala según pyproject.lock/pyproject.toml en .venv
```

### Variables de entorno útiles

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `ADMIN_USERNAME` | Usuario para el panel de alertas | `admin` |
| `ADMIN_PASSWORD` | Contraseña del admin | `hackeps2025` |
| `ADMIN_TOKEN_TTL_MINUTES` | Duración del token de admin en minutos | `120` |
| `APP_TIMEZONE` | Zona horaria usada para el contador | `Europe/Madrid` |
| `HACKATHON_START` | Inicio oficial del hacking (ISO 8601) | `2025-11-22T09:00:00+01:00` |
| `HACKATHON_END` | Final del hacking (ISO 8601) | `2025-11-23T11:00:00+01:00` |
| `REAL_DATA_RELEASE` | Momento en que se desbloquean los retos reales | Igual a `HACKATHON_START` |

### Ejecutar el backend

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

Visita `http://localhost:8000/docs` para la documentación interactiva. El websocket para alerts está en `/notifications/ws/events`. Para disparar alertas, primero haz `POST /notifications/admin/login` con las credenciales y usa el token resultante en `POST /notifications/alerts`.

### Personalizar el horario destacado

- Los datos se leen de `data/shedule.fake.json` (antes del release) y `data/shedule.real.json` (después).
- Cada bloque del horario acepta los campos habituales (`location`, `start`, `end`, `title`, `description`) y ahora también:
  - `showInMainPage`: booleano que indica si ese evento debe aparecer destacado en la portada del frontend cuando Twitch no esté en directe.
  - `link` (opcional): URL que se mostrará como botón “Detalls →” en la tarjeta destacada.
- Cuando ningún evento tenga `showInMainPage: true`, el frontend utilizará el fallback definido en su `FALLBACK_FEATURED_EVENT`.
