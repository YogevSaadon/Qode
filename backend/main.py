from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routes import router as api_router
import uvicorn
import os

# 1. Lifespan Manager (Startup/Shutdown events)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    await init_db()
    yield

# 2. App Initialization
app = FastAPI(title="Qode API", lifespan=lifespan)

# 3. CRITICAL CORS SETUP (Allow All for Mobile Testing)
# Explicitly allowing all origins to prevent blocking local network IPs
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Router Inclusion
app.include_router(api_router, prefix="/api")

# 5. Health Check Endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "Qode"}

# 6. Entry Point (Network Binding)
if __name__ == "__main__":
    # Listen on all interfaces (0.0.0.0) to allow mobile access
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
