from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from routes.activities import router as router_activities
from routes.challenges import Router as router_challenges
from routes.faqs import router as router_faqs
from routes.notifications import router as router_notifications
from routes.schedule import router as router_schedule
from routes.timer import router as router_timer

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return RedirectResponse(url="/docs")

app.include_router(router_faqs)
app.include_router(router_schedule)
app.include_router(router_timer)
app.include_router(router_challenges)
app.include_router(router_notifications)
app.include_router(router_activities)
