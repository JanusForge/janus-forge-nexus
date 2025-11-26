from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

print("🚀 Starting Janus Forge API...")

app = FastAPI(title="Janus Forge API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Janus Forge API is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "janusforge-nexus"}

# Test SQLAlchemy import (but don't fail if it doesn't work yet)
try:
    from sqlalchemy import create_engine
    print("✅ SQLAlchemy imported successfully")
    
    @app.get("/db-test")
    async def db_test():
        return {"database": "SQLAlchemy available"}
        
except ImportError as e:
    print(f"⚠️ SQLAlchemy not available: {e}")
    
    @app.get("/db-test") 
    async def db_test():
        return {"database": "SQLAlchemy not configured"}

print("✅ All routes configured successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
