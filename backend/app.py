import openai
from database.setup import setup_database
setup_database()

from dotenv import load_dotenv
load_dotenv()

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
app = FastAPI(title="Janus Forge Nexus API")

# CORS middleware
# In backend/app.py - update CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://janusforge.ai",
        "https://www.janusforge.ai", 
        "https://janus-forge-nexus.vercel.app",
        "https://janus-forge-nexus.onrender.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class BroadcastRequest(BaseModel):
    session_id: str
    ai_participants: List[str]
    initial_prompt: Optional[str] = None
    moderator_prompt: Optional[str] = None

class AIResponse(BaseModel):
    ai_name: str
    content: str
    key_takeaways: List[str] = []
    timestamp: str

class BroadcastResponse(BaseModel):
    session_id: str
    responses: List[AIResponse]
    timestamp: str

# Initialize AI clients
try:
    grok_client = openai.OpenAI(
        api_key=os.getenv('GROK_API_KEY'),
        base_url="https://api.x.ai/v1"
    )
    print("✅ Grok client initialized successfully")
except Exception as e:
    print(f"❌ Grok client initialization failed: {e}")
    grok_client = None

try:
    # Gemini client
    genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
    gemini_model = genai.GenerativeModel("gemini-1.5-flash-latest")
except Exception as e:
    print(f"Gemini client initialization failed: {e}")
    gemini_model = None

# Database connection
def get_db_connection():
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    return psycopg2.connect(
        os.getenv('DATABASE_URL'),
        cursor_factory=RealDictCursor
    )

# AI Response Functions
async def get_grok_response(prompt: str, context: str = "") -> str:
    if not grok_client:
        return "Grok API not configured"
    
    try:
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        
        chat_completion = grok_client.chat.completions.create(
            messages=[{"role": "user", "content": full_prompt}],
            model="grok-4-latest",
            temperature=0.7,
            max_tokens=2048
        )
        
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Grok Error: {str(e)}"


async def get_gemini_response(prompt: str, context: str = "") -> str:
    try:
        from google import genai
        from google.genai import types
        import os
        
        client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY"),  # Note: GEMINI_API_KEY not GOOGLE_API_KEY
        )

        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=full_prompt),
                ],
            ),
        ]

        # Try different models
        models_to_try = [
            "gemini-2.0-flash-exp",  # Latest flash model
            "gemini-1.5-flash",      # Stable flash model  
            "gemini-1.5-pro",        # Pro model
        ]
        
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                )
                return response.text
            except Exception as e:
                print(f"Gemini model {model} failed: {e}")
                continue
        
        return "Gemini Error: All models failed"
        
    except Exception as e:
        return f"Gemini Configuration Error: {str(e)}"



async def get_deepseek_response(prompt: str, context: str = "") -> str:
    api_key = os.getenv('DEEPSEEK_API_KEY')
    if not api_key:
        return "DeepSeek API not configured"
    
    try:
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": full_prompt}],
                    "temperature": 0.7,
                    "max_tokens": 2048
                }
            ) as response:
                data = await response.json()
                return data['choices'][0]['message']['content']
    except Exception as e:
        return f"DeepSeek Error: {str(e)}"

# Enhanced ethical checking
def ethical_check(prompt: str) -> bool:
    """Basic ethical check for prompts"""
    harmful_patterns = [
        r'harm|hurt|exploit|deceive|manipulate|cheat|steal',
        r'hate|stupid|inferior|because you are a|all you people are'
    ]
    
    import re
    for pattern in harmful_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            return False
    return True

# API Routes
@app.get("/")
async def root():
    return {"message": "Janus Forge Nexus API", "status": "operational"}

@app.get("/api/v1/sessions")
async def get_sessions():
    """Get all sessions with metadata"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT session_id, title, created_at, last_updated,
                   (SELECT COUNT(*) FROM messages WHERE session_id = s.session_id) as message_count
            FROM sessions s
            ORDER BY last_updated DESC
            LIMIT 50
        """)
        sessions = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/v1/session/{session_id}")
async def get_session(session_id: str):
    """Get specific session with all messages"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get session info
        cur.execute("SELECT * FROM sessions WHERE session_id = %s", (session_id,))
        session = cur.fetchone()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        cur.execute("""
            SELECT * FROM messages 
            WHERE session_id = %s 
            ORDER BY timestamp
        """, (session_id,))
        messages = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {
            "session_id": session_id,
            "title": session['title'],
            "created_at": session['created_at'],
            "last_updated": session['last_updated'],
            "messages": messages
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/v1/broadcast", response_model=BroadcastResponse)
async def broadcast_message(request: BroadcastRequest):
    """Broadcast message to multiple AI systems"""
    
    # Ethical check
    prompt_to_check = request.moderator_prompt or request.initial_prompt or ""
    if not ethical_check(prompt_to_check):
        raise HTTPException(status_code=400, detail="Prompt failed ethical check")
    
    try:
        # Save/update session
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO sessions (session_id, title, created_at, last_updated)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (session_id) 
            DO UPDATE SET last_updated = %s
        """, (
            request.session_id,
            f"Session {request.session_id}",
            datetime.utcnow(),
            datetime.utcnow(),
            datetime.utcnow()
        ))
        
        # Get context from previous messages
        cur.execute("""
            SELECT content, ai_name FROM messages 
            WHERE session_id = %s 
            ORDER BY timestamp DESC 
            LIMIT 10
        """, (request.session_id,))
        recent_messages = cur.fetchall()
        
        # Build context from recent messages
        context = "Recent conversation:\n"
        for msg in reversed(recent_messages):
            speaker = "User" if msg['ai_name'] == 'user' else msg['ai_name']
            context += f"{speaker}: {msg['content']}\n"
        
        # Prepare prompt
        if request.initial_prompt:
            prompt = request.initial_prompt
            system_context = "You are participating in a new multi-AI discussion session. Please introduce yourself and respond to the initial prompt."
        else:
            prompt = request.moderator_prompt
            system_context = f"You are participating in an ongoing multi-AI discussion. Here's the recent context:\n\n{context}\n\nPlease respond to the new prompt, building on the conversation."
        
        # Call AI systems
        responses = []
        tasks = []
        
        if 'grok' in request.ai_participants:
            tasks.append(('grok', get_grok_response(prompt, system_context)))
        if 'gemini' in request.ai_participants:
            tasks.append(('gemini', get_gemini_response(prompt, system_context)))
        if 'deepseek' in request.ai_participants:
            tasks.append(('deepseek', get_deepseek_response(prompt, system_context)))
        
        # Execute all AI calls concurrently
        results = await asyncio.gather(*[task[1] for task in tasks], return_exceptions=True)
        
        for (ai_name, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                content = f"{ai_name.title()} Error: {str(result)}"
            else:
                content = result
            
            response = AIResponse(
                ai_name=ai_name,
                content=content,
                key_takeaways=extract_key_takeaways(content),
                timestamp=datetime.utcnow().isoformat()
            )
            responses.append(response)
            
            # Save to database
            cur.execute("""
                INSERT INTO messages (session_id, role, ai_name, content, key_takeaways, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                request.session_id,
                'ai',
                ai_name,
                content,
                json.dumps(response.key_takeaways),
                datetime.utcnow()
            ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return BroadcastResponse(
            session_id=request.session_id,
            responses=responses,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")

def extract_key_takeaways(content: str) -> List[str]:
    """Extract key takeaways from AI response (simplified)"""
    # Simple extraction - in production, use more sophisticated NLP
    sentences = content.split('. ')
    takeaways = [s.strip() for s in sentences[:3] if len(s) > 20]
    return takeaways if takeaways else ["Key insights embedded in response"]

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
