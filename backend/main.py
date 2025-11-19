"""
FastAPI application entry point.
Configures CORS, middleware, and initializes the database.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db
from routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Initializes database on startup.
    """
    # Startup
    await init_db()
    print(f"[OK] Database initialized at {settings.DATABASE_URL}")
    yield
    # Shutdown (if needed)


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
