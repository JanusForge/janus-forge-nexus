from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import os
import asyncio
from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import uvicorn
from dotenv import load_dotenv
import openai
from anthropic import Anthropic
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# PostgreSQL Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://janus_forge_db_user:vEZ8Y9ryMozHGiz7LBbbyi6PIv42FR8Q@dpg-d4f701je5dus73cd9djg-a.oregon-postgres.render.com/janus_forge_db")

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
app = FastAPI(
    title="Janus Forge Nexus API", 
    version="2.0.0",
    description="Professional AI Debate Platform with 5 AI Models"
)

# CORS middleware - Updated for new frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.janusforge.ai",
        "https://janusforge.ai", 
        "https://janus-forge-nexus.vercel.app",
        "https://janus-forge-nexus-hp9cwyvh7-janusforges-projects.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Pydantic models - Enhanced for professional features
class BroadcastRequest(BaseModel):
    session_id: str
    ai_participants: List[str] = ["grok", "gemini", "deepseek", "openai", "anthropic"]
    initial_prompt: Optional[str] = None
    moderator_prompt: Optional[str] = None
    tier: Optional[str] = "free"  # New: Support tier-based AI model access

class AIResponse(BaseModel):
    ai_name: str
    content: str
    timestamp: str

class BroadcastResponse(BaseModel):
    session_id: str
    responses: List[AIResponse]

class SessionResponse(BaseModel):
    session_id: str
    last_updated: str
    message_count: int
    ai_participants: List[str] = []

class SessionsResponse(BaseModel):
    sessions: List[SessionResponse]

class DeleteResponse(BaseModel):
    status: str
    message: str

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# AI Model Configuration
AI_MODELS = {
    "grok": {
        "name": "Grok",
        "icon": "🦄",
        "tiers": ["pro", "enterprise"]
    },
    "gemini": {
        "name": "Gemini", 
        "icon": "🌀",
        "tiers": ["free", "pro", "enterprise"]
    },
    "deepseek": {
        "name": "DeepSeek",
        "icon": "🎯", 
        "tiers": ["free", "pro", "enterprise"]
    },
    "openai": {
        "name": "OpenAI",
        "icon": "🤖",
        "tiers": ["pro", "enterprise"]
    },
    "anthropic": {
        "name": "Claude",
        "icon": "🧠", 
        "tiers": ["enterprise"]
    }
}

# Tier Configuration
TIERS = {
    "free": {
        "ai_models": ["gemini", "deepseek"],
        "max_sessions": 3,
        "max_messages": 20
    },
    "pro": {
        "ai_models": ["grok", "gemini", "deepseek", "openai"],
        "max_sessions": 50,
        "max_messages": 500
    },
    "enterprise": {
        "ai_models": ["grok", "gemini", "deepseek", "openai", "anthropic"],
        "max_sessions": 1000,
        "max_messages": 10000
    }
}

# AI Integration Functions
async def get_ai_response(ai_name: str, prompt: str, tier: str = "free") -> str:
    """Get response from actual AI service with tier-based access control"""
    try:
        print(f"🎯 [TIER: {tier}] Calling {ai_name} API with prompt: '{prompt[:100]}...'")
        
        # Check if AI model is available in current tier
        if ai_name not in TIERS.get(tier, {}).get("ai_models", []):
            return f"[{ai_name}] Upgrade to {get_minimum_tier(ai_name)} tier to access this AI model"
        
        if ai_name == "grok":
            result = await call_grok_api(prompt)
        elif ai_name == "gemini":
            result = await call_gemini_api(prompt)
        elif ai_name == "deepseek":
            result = await call_deepseek_api(prompt)
        elif ai_name == "openai":
            result = await call_openai_api(prompt)
        elif ai_name == "anthropic":
            result = await call_anthropic_api(prompt)
        else:
            result = f"[{ai_name}] Unknown AI service"

        print(f"✅ [DEBUG] {ai_name} result length: {len(result)} chars")
        return result

    except Exception as e:
        print(f"💥 [DEBUG] {ai_name} overall error: {str(e)}")
        import traceback
        print(f"📋 [DEBUG] {ai_name} traceback: {traceback.format_exc()}")
        return f"[{ai_name}] Error: {str(e)}"

def get_minimum_tier(ai_name: str) -> str:
    """Get the minimum tier required for an AI model"""
    for tier, config in TIERS.items():
        if ai_name in config["ai_models"]:
            return tier
    return "enterprise"

async def call_grok_api(prompt: str) -> str:
    """Call Grok API"""
    try:
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            return "🦄 Grok: API key not configured"

        client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.x.ai/v1"
        )

        response = await client.chat.completions.create(
            model="grok-4-latest",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )

        return f"🦄 Grok: {response.choices[0].message.content}"

    except Exception as e:
        return f"🦄 Grok Error: {str(e)}"

async def call_gemini_api(prompt: str) -> str:
    """Call Gemini API"""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "🌀 Gemini: API key not configured"

        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        return f"🌀 Gemini: {response.text}"

    except Exception as e:
        return f"🌀 Gemini Error: {str(e)}"

async def call_deepseek_api(prompt: str) -> str:
    """Call DeepSeek API"""
    try:
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            return "🎯 DeepSeek: API key not configured"

        client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com/v1"
        )

        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )

        return f"🎯 DeepSeek: {response.choices[0].message.content}"

    except Exception as e:
        return f"🎯 DeepSeek Error: {str(e)}"

async def call_openai_api(prompt: str) -> str:
    """Call OpenAI API"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return "🤖 OpenAI: API key not configured"

        client = openai.AsyncOpenAI(api_key=api_key)

        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )

        return f"🤖 OpenAI: {response.choices[0].message.content}"

    except Exception as e:
        return f"🤖 OpenAI Error: {str(e)}"

async def call_anthropic_api(prompt: str) -> str:
    """Call Anthropic Claude API"""
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            return "🧠 Claude: API key not configured"

        client = Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=150,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        return f"🧠 Claude: {response.content[0].text}"

    except Exception as e:
        return f"🧠 Claude Error: {str(e)}"

def validate_ai_participants(ai_participants: List[str], tier: str) -> List[str]:
    """Validate and filter AI participants based on tier access"""
    valid_models = TIERS.get(tier, {}).get("ai_models", [])
    filtered_participants = [ai for ai in ai_participants if ai in valid_models]
    
    # If no valid participants, use tier defaults
    if not filtered_participants:
        filtered_participants = valid_models[:2]  # Use first 2 available models
    
    return filtered_participants

# API Routes
@app.get("/")
async def root():
    return {
        "message": "Janus Forge Nexus Professional API", 
        "status": "running",
        "version": "2.0.0",
        "features": {
            "ai_models": list(AI_MODELS.keys()),
            "tiers": list(TIERS.keys()),
            "supported_operations": ["debate", "session_management", "bulk_operations"]
        }
    }

@app.get("/api/v1/sessions", response_model=SessionsResponse)
async def get_sessions(db: Session = Depends(get_db)):
    """Get all sessions with message counts and AI participants"""
    try:
        sessions = db.query(DBSession).order_by(DBSession.last_updated.desc()).all()

        session_list = []
        for session in sessions:
            message_count = db.query(DBMessage).filter(DBMessage.session_id == session.session_id).count()
            
            session_list.append(SessionResponse(
                session_id=session.session_id,
                last_updated=session.last_updated.isoformat(),
                message_count=message_count,
                ai_participants=session.ai_participants or []
            ))

        return SessionsResponse(sessions=session_list)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sessions: {str(e)}")

@app.get("/api/v1/session/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get specific session with full message history"""
    try:
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
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else datetime.utcnow().isoformat()
            })

        return {
            "session_id": session_id,
            "messages": message_list,
            "last_updated": session.last_updated.isoformat(),
            "ai_participants": session.ai_participants or [],
            "created_at": session.created_at.isoformat() if session.created_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load session: {str(e)}")

@app.post("/api/v1/broadcast", response_model=BroadcastResponse)
async def broadcast_message(request: BroadcastRequest, db: Session = Depends(get_db)):
    """Broadcast message to AI participants with tier-based access control"""
    try:
        # Validate and filter AI participants based on tier
        valid_participants = validate_ai_participants(request.ai_participants, request.tier)
        
        if not valid_participants:
            raise HTTPException(
                status_code=403, 
                detail=f"No valid AI models available for tier '{request.tier}'. Available: {TIERS.get(request.tier, {}).get('ai_models', [])}"
            )

        # Check if session exists, create if not
        session = db.query(DBSession).filter(DBSession.session_id == request.session_id).first()
        if not session:
            session = DBSession(
                session_id=request.session_id,
                ai_participants=valid_participants
            )
            db.add(session)
            db.commit()
            db.refresh(session)

        # Update last_updated
        session.last_updated = datetime.utcnow()
        session.ai_participants = valid_participants  # Update with validated participants
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

        # Generate AI responses in parallel for better performance
        ai_responses = []
        tasks = []
        
        for ai_name in valid_participants:
            task = get_ai_response(ai_name, prompt, request.tier)
            tasks.append(task)

        # Wait for all AI responses to complete
        ai_contents = await asyncio.gather(*tasks, return_exceptions=True)

        # Process responses and store in database
        for ai_name, ai_content in zip(valid_participants, ai_contents):
            if isinstance(ai_content, Exception):
                ai_content = f"[{ai_name}] Error: {str(ai_content)}"

            # Store AI response
            ai_message = DBMessage(
                session_id=request.session_id,
                role="ai",
                ai_name=ai_name,
                content=ai_content
            )
            db.add(ai_message)
            db.flush()  # Ensure timestamp is set

            # Handle potential None timestamp
            timestamp = ai_message.timestamp.isoformat() if ai_message.timestamp else datetime.utcnow().isoformat()

            ai_responses.append(AIResponse(
                ai_name=ai_name,
                content=ai_content,
                timestamp=timestamp
            ))

        db.commit()

        return BroadcastResponse(
            session_id=request.session_id,
            responses=ai_responses
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"💥 Broadcast error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")

@app.delete("/api/v1/session/{session_id}", response_model=DeleteResponse)
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a session and all its messages from the database"""
    try:
        print(f"🗑️ [DELETE] Attempting to delete session: {session_id}")

        # Check if session exists
        session = db.query(DBSession).filter(DBSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Delete all messages for this session
        message_count = db.query(DBMessage).filter(DBMessage.session_id == session_id).delete()

        # Delete the session
        db.delete(session)
        db.commit()

        print(f"✅ [DELETE] Successfully deleted session: {session_id} (messages: {message_count})")
        return DeleteResponse(
            status="success",
            message=f"Session {session_id} deleted successfully ({message_count} messages removed)"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"💥 [DELETE] Error deleting session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@app.delete("/api/v1/sessions/bulk")
async def bulk_delete_sessions(session_ids: List[str], db: Session = Depends(get_db)):
    """Bulk delete multiple sessions"""
    try:
        if not session_ids:
            raise HTTPException(status_code=400, detail="No session IDs provided")

        print(f"🗑️ [BULK DELETE] Attempting to delete {len(session_ids)} sessions")

        deleted_count = 0
        message_count = 0
        
        for session_id in session_ids:
            # Check if session exists
            session = db.query(DBSession).filter(DBSession.session_id == session_id).first()
            if session:
                # Delete all messages for this session
                msg_count = db.query(DBMessage).filter(DBMessage.session_id == session_id).delete()
                # Delete the session
                db.delete(session)
                deleted_count += 1
                message_count += msg_count

        db.commit()

        print(f"✅ [BULK DELETE] Successfully deleted {deleted_count} sessions ({message_count} messages total)")
        return {
            "status": "success",
            "message": f"Deleted {deleted_count} sessions ({message_count} messages)",
            "deleted_sessions": deleted_count,
            "deleted_messages": message_count
        }

    except Exception as e:
        db.rollback()
        print(f"💥 [BULK DELETE] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")

@app.get("/api/v1/tiers")
async def get_tiers():
    """Get information about available tiers and their features"""
    return {
        "tiers": TIERS,
        "ai_models": AI_MODELS
    }

@app.get("/api/v1/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Test database connection
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()

        # Check API keys (without making actual calls)
        api_keys_status = {
            "grok": bool(os.getenv("GROK_API_KEY")),
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
            "deepseek": bool(os.getenv("DEEPSEEK_API_KEY")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "anthropic": bool(os.getenv("ANTHROPIC_API_KEY"))
        }

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "api_keys": api_keys_status,
            "active_models": sum(api_keys_status.values()),
            "version": "2.0.0"
        }

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# Test endpoint
@app.delete("/api/v1/test")
async def test_delete():
    return {"status": "success", "message": "DELETE endpoint is working!"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
