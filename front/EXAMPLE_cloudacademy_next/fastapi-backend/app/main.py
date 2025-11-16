from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import uvicorn

from .config import settings
from .api import chat_router
from .models import ErrorResponse

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API backend for CloudAcademy course chat assistants powered by Amazon Bedrock",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(chat_router)

# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with API information
    """
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "timestamp": datetime.utcnow(),
        "docs": "/docs" if settings.debug else "disabled",
        "supported_courses": settings.supported_courses
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """
    Global exception handler for unhandled errors
    """
    print(f"Unhandled exception: {exc}")
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail="An unexpected error occurred",
            timestamp=datetime.utcnow()
        ).dict()
    )

# Health check endpoint
@app.get("/health")
async def health():
    """
    Health check endpoint for K8s probes
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": settings.app_version
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """
    Application startup tasks
    """
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"📚 Supported courses: {', '.join(settings.supported_courses)}")
    print(f"🔐 CORS origins: {', '.join(settings.cors_origins)}")
    print(f"🌐 Debug mode: {settings.debug}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown tasks
    """
    print(f"🛑 Shutting down {settings.app_name}")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )