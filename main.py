from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routers import interpret, orders, settings

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interpret.router, prefix="/interpret", tags=["interpret"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(settings.router, prefix="/settings", tags=["settings"])
