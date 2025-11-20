from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import os
from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# PostgreSQL Database setup - Use your Render PostgreSQL URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://janusforge:2WMCqNlsrgJcLJIYqYwSmPnubASbtpKX@dpg-d4e96nuuk2gs739dfk0g-a.oregon-postgres.render.com/janusforge")

# For PostgreSQL, we need to use the async-compatible URL format
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models
class DBSession(Base):
    __tablename__ = "sessions"
    
    session_id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow)
    ai_participants = Column(JSON)  # Store as JSON array

class DBMessage(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, index=True)
    role = Column(String)  # 'user' or 'ai'
    ai_name = Column(String, nullable=True)  # Only for AI messages
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(title="Janus Forge Nexus API", version="1.0.0")

# CORS middleware
# Find the CORS configuration in app.py (around line 50-60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.janusforge.ai",
        "https://janusforge.ai", 
        "https://janus-forge-nexus-hp9cwyvh7-janusforges-projects.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic models
class BroadcastRequest(BaseModel):
    session_id: str
    ai_participants: List[str] = ["grok", "gemini", "deepseek"]
    initial_prompt: Optional[str] = None
    moderator_prompt: Optional[str] = None

class AIResponse(BaseModel):
    ai_name: str
    content: str
    timestamp: str

class BroadcastResponse(BaseModel):
    session_id: str
    responses: List[AIResponse]

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Add this to your app.py file (find a good spot near other routes)

@app.delete("/api/v1/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its messages"""
    try:
        print(f"🎯 DELETE endpoint called for session: {session_id}")
        
        # TODO: Add your actual database deletion logic here
        # For now, just return success to test the frontend
        
        return {
            "status": "success",
            "message": f"Session {session_id} deleted successfully"
        }
            
    except Exception as e:
        print(f"💥 Error in DELETE endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")



# AI Integration
async def get_ai_response(ai_name: str, prompt: str) -> str:
    """Get response from actual AI service"""
    try:
        print(f"🎯 Calling {ai_name} with prompt: {prompt[:50]}...")
        
        if ai_name == "grok":
            # Grok API integration
            return await call_grok_api(prompt)
            
        elif ai_name == "gemini":
            # Gemini API integration  
            return await call_gemini_api(prompt)
            
        elif ai_name == "deepseek":
            # DeepSeek API integration
            return await call_deepseek_api(prompt)
            
        else:
            return f"[{ai_name}] Unknown AI service"
            
    except Exception as e:
        print(f"💥 {ai_name} API error: {str(e)}")
        return f"[{ai_name}] Error: {str(e)}"

async def call_grok_api(prompt: str) -> str:
    """Call Grok API"""
    # TODO: Implement actual Grok API call
    # You'll need xAI Grok API credentials
    return f"🦄 Grok: I've analyzed '{prompt}' and here's my unique take..."

async def call_gemini_api(prompt: str) -> str:
    """Call Gemini API"""
    # TODO: Implement actual Gemini API call
    # You'll need Google AI Studio API key
    return f"🌀 Gemini: After comprehensive analysis of '{prompt}', I conclude..."

async def call_deepseek_api(prompt: str) -> str:
    """Call DeepSeek API"""
    # TODO: Implement actual DeepSeek API call  
    # You'll need DeepSeek API credentials
    return f"🎯 DeepSeek: My focused analysis of '{prompt}' reveals..."

# Routes
@app.get("/")
async def root():
    return {"message": "Janus Forge Nexus API", "status": "running"}

@app.get("/api/v1/sessions")
async def get_sessions(db: Session = Depends(get_db)):
    """Get all sessions with message counts"""
    sessions = db.query(DBSession).all()
    
    session_list = []
    for session in sessions:
        message_count = db.query(DBMessage).filter(DBMessage.session_id == session.session_id).count()
        session_list.append({
            "session_id": session.session_id,
            "last_updated": session.last_updated.isoformat(),
            "message_count": message_count
        })
    
    return {"sessions": session_list}

@app.get("/api/v1/session/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get specific session with messages"""
    session = db.query(DBSession).filter(DBSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(DBMessage).filter(DBMessage.session_id == session_id).order_by(DBMessage.timestamp).all()
    
    message_list = []
    for msg in messages:
        message_list.append({
            "role": msg.role,
            "ai_name": msg.ai_name,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat()
        })
    
    return {
        "session_id": session_id,
        "messages": message_list,
        "last_updated": session.last_updated.isoformat()
    }

@app.post("/api/v1/broadcast")
async def broadcast_message(request: BroadcastRequest, db: Session = Depends(get_db)):
    """Broadcast message to AI participants and store in database"""

    # Check if session exists, create if not
    session = db.query(DBSession).filter(DBSession.session_id == request.session_id).first()
    if not session:
        session = DBSession(
            session_id=request.session_id,
            ai_participants=request.ai_participants
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Update last_updated
    session.last_updated = datetime.utcnow()
    db.commit()

    # Determine the prompt to use
    prompt = request.moderator_prompt or request.initial_prompt or "Hello"

    # Add user message if it's a moderator prompt
    if request.moderator_prompt:
        user_message = DBMessage(
            session_id=request.session_id,
            role="user",
            content=request.moderator_prompt
        )
        db.add(user_message)
        db.commit()

    # Generate AI responses
    ai_responses = []
    for ai_name in request.ai_participants:
        # Get AI response (replace with your actual AI integration)
        ai_content = await get_ai_response(ai_name, prompt)

        # Store AI response
        ai_message = DBMessage(
            session_id=request.session_id,
            role="ai",
            ai_name=ai_name,
            content=ai_content
        )
        db.add(ai_message)
        db.flush()  # ← FIX: This ensures timestamp is set before we use it

        # FIX: Handle potential None timestamp safely
        timestamp = ai_message.timestamp.isoformat() if ai_message.timestamp else datetime.utcnow().isoformat()
        
        ai_responses.append(AIResponse(
            ai_name=ai_name,
            content=ai_content,
            timestamp=timestamp  # ← FIX: Use the safe timestamp
        ))

    db.commit()

    return BroadcastResponse(
        session_id=request.session_id,
        responses=ai_responses
    )

# DELETE ENDPOINT - This is what fixes your issue!
@app.delete("/api/v1/session/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a session and all its messages from the database"""
    try:
        print(f"Attempting to delete session: {session_id}")
        
        # Check if session exists
        session = db.query(DBSession).filter(DBSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete all messages for this session
        db.query(DBMessage).filter(DBMessage.session_id == session_id).delete()
        
        # Delete the session
        db.delete(session)
        db.commit()
        
        print(f"Successfully deleted session: {session_id}")
        return {
            "status": "success", 
            "message": f"Session {session_id} deleted successfully"
        }
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

# Test endpoint
@app.delete("/api/v1/test")
async def test_delete():
    return {"status": "success", "message": "DELETE endpoint is working!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
