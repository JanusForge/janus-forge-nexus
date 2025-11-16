from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel
import uvicorn
import os
import asyncio
import google.generativeai as genai
from datetime import datetime
import json
from typing import List, Dict, Optional
import aiohttp

# Initialize FastAPI app
app = FastAPI(title="Janus Forge API")
origins = [
    "https://janus-forge-nexus.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class BroadcastRequest(BaseModel):
    session_id: Optional[str] = None
    initial_prompt: Optional[str] = None
    moderator_prompt: Optional[str] = None
    ai_participants: List[str] = []

class AIResponse(BaseModel):
    ai_name: str
    content: str
    timestamp: str

# Configuration
MODEL_CONFIG = {
    "grok": {
        "model": "llama-3.1-8b-instant",
        "temperature": 0.7,
        "max_tokens": 1000,
        "api_key": os.getenv("GROK_API_KEY")
    },
    "gemini": {
        "model_name": "models/gemini-2.5-flash",
        "temperature": 0.7,
        "max_tokens": 1000,
        "api_key": os.getenv("GEMINI_API_KEY")
    },
    "deepseek": {
        "model": "deepseek-chat",
        "temperature": 0.7,
        "max_tokens": 1000,
        "api_key": os.getenv("DEEPSEEK_API_KEY")
    }
}

# Initialize Gemini
try:
    genai.configure(api_key=MODEL_CONFIG["gemini"]["api_key"])
    print("✅ Gemini configured successfully")
except Exception as e:
    print(f"⚠️  Gemini configuration warning: {e}")

# In-memory storage
sessions_db = {}

# Helper functions
def generate_session_title(messages):
    """Auto-generate a meaningful title from conversation content"""
    if not messages:
        return "New Conversation"
    
    for msg in messages:
        if msg.get("role") in ["ai", "moderator"]:
            content = msg.get("content", "")
            lines = content.split('\n')
            for line in lines:
                if len(line.strip()) > 10 and not line.startswith(('GEMINI:', 'GROK:', 'DEEPSEEK:')):
                    return line.strip()[:50] + "..." if len(line.strip()) > 50 else line.strip()
    return "AI Collaboration Session"

async def call_grok(prompt: str, session) -> str:
    """Call Grok API with SuperGrok Business access"""
    try:
        print(f"🔧 DEBUG: Calling Grok API (SuperGrok Business)")
        
        headers = {
            "Authorization": f"Bearer {MODEL_CONFIG['grok']['api_key']}",
            "Content-Type": "application/json"
        }
        
        # Try common SuperGrok model names
        supergrok_models = [
            "grok-2-1212",      # Most likely
            "grok-2",           # Alternative
            "grok-beta",        # Fallback
            "grok-2-latest",    # Some users report this
        ]
        
        for model_name in supergrok_models:
            try:
                print(f"🔧 DEBUG: Trying model: {model_name}")
                
                payload = {
                    "messages": [{"role": "user", "content": prompt}],
                    "model": model_name,
                    "temperature": MODEL_CONFIG['grok']['temperature'],
                    "max_tokens": MODEL_CONFIG['grok']['max_tokens'],
                    "stream": False
                }
                
                async with aiohttp.ClientSession() as http_session:
                    async with http_session.post(
                        "https://api.x.ai/v1/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=30
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            grok_response = data["choices"][0]["message"]["content"]
                            print(f"🔧 DEBUG: ✅ Success with model: {model_name}")
                            print(f"🔧 DEBUG: Grok response: {grok_response[:100]}...")
                            return f"GROK: {grok_response}"
                        else:
                            error_text = await response.text()
                            print(f"🔧 DEBUG: ❌ Model {model_name} failed: {error_text}")
                            
            except Exception as e:
                print(f"🔧 DEBUG: Model {model_name} error: {str(e)}")
                continue
        
        # If all models fail, help debug
        print("🔧 DEBUG: All model attempts failed. Checking available models...")
        return "GROK: [Model configuration needed - checking available models...]"
                    
    except Exception as e:
        print(f"🔧 DEBUG: Grok ERROR: {str(e)}")
        return f"GROK: Error - {str(e)}"


async def call_gemini(prompt: str, session) -> str:
    """Call Gemini API with correct configuration"""
    try:
        print(f"🔧 DEBUG: Calling Gemini with model: {MODEL_CONFIG['gemini']['model_name']}")
        
        model = genai.GenerativeModel(MODEL_CONFIG["gemini"]["model_name"])
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=MODEL_CONFIG["gemini"]["temperature"],
                max_output_tokens=MODEL_CONFIG["gemini"]["max_tokens"]
            )
        )
        
        # FIXED: Handle Gemini 2.5 response format
        if response.candidates and len(response.candidates) > 0:
            text_content = ""
            for part in response.candidates[0].content.parts:
                text_content += part.text
            print(f"🔧 DEBUG: Gemini response received: {len(text_content)} characters")
            return f"GEMINI: {text_content}"
        else:
            return "GEMINI: [No response generated]"
        
    except Exception as e:
        print(f"🔧 DEBUG: Gemini ERROR: {str(e)}")
        return f"GEMINI: Error - {str(e)}"



async def call_deepseek(prompt: str, session) -> str:
    """Call DeepSeek API"""
    try:
        print(f"🔧 DEBUG: Calling DeepSeek API")
        print(f"🔧 DEBUG: DeepSeek API Key present: {bool(MODEL_CONFIG['deepseek']['api_key'])}")
        
        # REAL DEEPSEEK API IMPLEMENTATION
        headers = {
            "Authorization": f"Bearer {MODEL_CONFIG['deepseek']['api_key']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": MODEL_CONFIG['deepseek']['temperature'],
            "max_tokens": MODEL_CONFIG['deepseek']['max_tokens']
        }
        
        async with aiohttp.ClientSession() as http_session:
            async with http_session.post(
                "https://api.deepseek.com/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    deepseek_response = data["choices"][0]["message"]["content"]
                    return f"DEEPSEEK: {deepseek_response}"
                else:
                    error_text = await response.text()
                    return f"DEEPSEEK: API Error - {error_text}"
                    
    except Exception as e:
        print(f"🔧 DEBUG: DeepSeek ERROR: {str(e)}")
        return f"DEEPSEEK: Error - {str(e)}"

# AI calling mapping
AI_CALLERS = {
    "grok": call_grok,
    "gemini": call_gemini,
    "deepseek": call_deepseek
}

# API Routes
@app.get("/")
async def root():
    return {"message": "Janus Forge API is running!"}

@app.post("/api/v1/broadcast")
async def broadcast_message(request: BroadcastRequest):
    """Broadcast message to multiple AIs and get responses"""
    
    print(f"🎯 INCOMING REQUEST: {request.dict()}")
    
    # Create new session or get existing
    if request.session_id and request.session_id in sessions_db:
        session = sessions_db[request.session_id]
        print(f"🔧 DEBUG: Using existing session: {session['session_id']}")
    else:
        session_id = request.session_id or os.urandom(16).hex()
        session = {
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "ai_participants": request.ai_participants,
            "messages": [],
            "title": "New Conversation"
        }
        sessions_db[session_id] = session
        print(f"🔧 DEBUG: Created new session: {session_id}")
    
    # Add moderator message
    prompt = request.moderator_prompt or request.initial_prompt or "Hello!"
    moderator_message = {
        "role": "moderator",
        "content": prompt,
        "timestamp": datetime.now().isoformat()
    }
    session["messages"].append(moderator_message)
    
    # DEBUG: Print request details
    print(f"🔧 DEBUG: AI participants: {request.ai_participants}")
    print(f"🔧 DEBUG: Prompt: {prompt[:100]}...")
    print(f"🔧 DEBUG: Session ID: {session['session_id']}")
    
    # Call all AI participants
    tasks = []
    for ai_name in request.ai_participants:
        if ai_name in AI_CALLERS:
            # Build context from recent messages
            full_prompt = f"Conversation context:\n"
            for msg in session["messages"][-5:]:  # Last 5 messages for context
                full_prompt += f"{msg['role'].upper()}: {msg['content']}\n"
            full_prompt += f"\nCurrent message: {prompt}\n\nPlease respond:"
            
            print(f"🔧 DEBUG: Calling {ai_name} with prompt length: {len(full_prompt)}")
            task = AI_CALLERS[ai_name](full_prompt, session)
            tasks.append((ai_name, task))
        else:
            print(f"🔧 DEBUG: Unknown AI: {ai_name}")
    
    # Gather responses
    responses = []
    for ai_name, task in tasks:
        try:
            content = await task
            response = {
                "role": "ai",
                "ai_name": ai_name,
                "content": content,
                "timestamp": datetime.now().isoformat()
            }
            session["messages"].append(response)
            responses.append(response)
            print(f"🔧 DEBUG: {ai_name} response: {content[:100]}...")
        except Exception as e:
            error_response = {
                "role": "ai", 
                "ai_name": ai_name,
                "content": f"{ai_name.upper()}: Error - {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            session["messages"].append(error_response)
            responses.append(error_response)
            print(f"🔧 DEBUG: {ai_name} ERROR: {str(e)}")
    
    # Update session title if new
    if len(session["messages"]) <= 2:  # Only moderator + first responses
        session["title"] = generate_session_title(session["messages"])
        print(f"🔧 DEBUG: Generated session title: {session['title']}")
    
    session["last_updated"] = datetime.now().isoformat()
    
    print(f"🎯 AI RESPONSES RECEIVED: {len(responses)}")
    print(f"📤 UPDATED SESSION: {session['session_id']}")
    return {
        "session_id": session["session_id"],
        "responses": responses,
        "message_count": len(session["messages"])
    }

@app.get("/api/v1/session/{session_id}")
async def get_session(session_id: str):
    """Get a specific session"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions_db[session_id]

@app.get("/api/v1/sessions")
async def list_sessions():
    """Get list of all conversation sessions"""
    sessions = []
    for session_id, session_data in sessions_db.items():
        sessions.append({
            "session_id": session_id,
            "title": session_data.get("title", "Untitled Conversation"),
            "created_at": session_data.get("created_at"),
            "last_updated": session_data.get("last_updated"),
            "participants": session_data.get("ai_participants", []),
            "message_count": len(session_data.get("messages", []))
        })
    
    # Sort by last updated (newest first)
    sessions.sort(key=lambda x: x["last_updated"], reverse=True)
    return {"sessions": sessions}

@app.delete("/api/v1/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a specific session"""
    if session_id in sessions_db:
        del sessions_db[session_id]
        return {"status": "deleted", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found")

@app.post("/api/v1/session/{session_id}/title")
async def update_session_title(session_id: str, title_data: dict):
    """Update session title"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    
    sessions_db[session_id]["title"] = title_data.get("title", "Untitled Conversation")
    return {"status": "title_updated", "title": title_data["title"]}

# Export endpoints
@app.get("/api/v1/session/{session_id}/export/txt")
async def export_session_txt(session_id: str):
    """Export session as text file"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions_db[session_id]
    return export_text(session_data)

@app.get("/api/v1/session/{session_id}/export/json")
async def export_session_json(session_id: str):
    """Export session as JSON"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions_db[session_id]
    return export_json(session_data)

@app.get("/api/v1/session/{session_id}/export/md")
async def export_session_md(session_id: str):
    """Export session as Markdown"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = sessions_db[session_id]
    return export_markdown(session_data)

# Export helper functions
def export_json(session_data):
    """Export as structured JSON"""
    return {
        "export_format": "json",
        "version": "1.0",
        "exported_at": datetime.now().isoformat(),
        "session": session_data
    }

def export_text(session_data):
    """Export as readable text"""
    messages = session_data.get("messages", [])
    text_content = f"Janus Forge Conversation Export\n"
    text_content += f"Session: {session_data.get('title', 'Untitled')}\n"
    text_content += f"Participants: {', '.join(session_data.get('ai_participants', []))}\n"
    text_content += f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    text_content += "="*50 + "\n\n"
    
    for msg in messages:
        role = msg.get("role", "").upper()
        content = msg.get("content", "")
        timestamp = msg.get("timestamp", "")
        
        text_content += f"[{timestamp}] {role}:\n"
        text_content += f"{content}\n"
        text_content += "-"*40 + "\n"
    
    return PlainTextResponse(
        content=text_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=janus_session_{session_data['session_id']}.txt"}
    )

def export_markdown(session_data):
    """Export as Markdown for easy sharing"""
    messages = session_data.get("messages", [])
    md_content = f"# Janus Forge Conversation\n\n"
    md_content += f"**Session**: {session_data.get('title', 'Untitled')}  \n"
    md_content += f"**Participants**: {', '.join(session_data.get('ai_participants', []))}  \n"
    md_content += f"**Exported**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n\n"
    
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        timestamp = msg.get("timestamp", "")
        
        if role == "moderator":
            md_content += f"### 👤 Moderator ({timestamp})\n\n{content}\n\n"
        else:
            ai_name = content.split(':')[0] if ':' in content else role
            md_content += f"### 🤖 {ai_name} ({timestamp})\n\n{content}\n\n"
    
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=janus_session_{session_data['session_id']}.md"}
    )

