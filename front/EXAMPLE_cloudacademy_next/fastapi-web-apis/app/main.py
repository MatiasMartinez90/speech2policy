from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from contextlib import asynccontextmanager

from app.config.settings import settings
from app.api import users, webhooks
from app.database.connection import test_db_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting CloudAcademy Web APIs service...")
    
    # Test database connection
    if await test_db_connection():
        logger.info("✅ Database connection successful")
    else:
        logger.error("❌ Database connection failed")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down CloudAcademy Web APIs service...")

# Create FastAPI app
app = FastAPI(
    title="CloudAcademy Web APIs",
    description="Microservice for CloudAcademy web application APIs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "CloudAcademy Web APIs",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "health": "/health",
            "users": "/api/users/*"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes"""
    try:
        # Test database connection
        db_healthy = await test_db_connection()
        
        if db_healthy:
            return {"status": "healthy", "database": "connected"}
        else:
            raise HTTPException(status_code=503, detail="Database connection failed")
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Global exception handler caught: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )