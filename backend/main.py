import os
import random
import asyncio
import httpx # New import for simple async HTTP requests
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import stripe
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# --- DRIVERS (Keep for type reference) ---
import google.generativeai as genai 
from openai import AsyncOpenAI 

# --- DATABASE IMPORTS ---
from database import init_db, get_db, User, verify_password, get_password_hash, SessionLocal

# --- GLOBAL STATE ---
load_dotenv()
clients = {} 
print("🚀 Starting Janus Forge Nexus Brain...")

app = FastAPI(title="Janus Forge Nexus API")

# --- INITIALIZATION HOOKS (CRITICAL FIX: MINIMAL STARTUP) ---
# We keep only the absolute minimum required to start the server.
# All slow setup (DB, AI keys) is done via the new async client or helper function.

def sync_db_setup():
    """Runs database setup and admin user creation."""
    init_db()
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@janus.com").first():
            print("🆕 Creating Admin User: admin@janus.com / admin123")
            admin_user = User(email="admin@janus.com", full_name="Janus Admin", hashed_password=get_password_hash("admin123"), tier="visionary")
            db.add(admin_user)
            db.commit()
        print("✅ Database Setup Complete.")
    except Exception as e:
        print(f"❌ DB Startup Error: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    """Triggers synchronous setup in a non-blocking way."""
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, sync_db_setup)

# --- AI HELPER: Direct Async HTTP Calls (Bypassing SDK Conflict) ---
async def ask_model(provider: str, prompt: str):
    """Uses httpx to make non-blocking calls to the specified AI endpoint."""
    
    # 1. Define URL and Key based on provider
    if provider == 'gemini':
        api_key = os.getenv("GEMINI_API_KEY")
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        
    elif provider == 'deepseek':
        api_key = os.getenv("DEEPSEEK_API_KEY")
        url = "https://api.deepseek.com/v1/chat/completions"
        
    else:
        return f"Error: {provider.upper()} API Key Missing."

    # 2. Construct the Payload
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "config": {"maxOutputTokens": 200},
        "model": "gemini-2.0-flash" if provider == 'gemini' else "deepseek-chat"
    }

    # 3. Make the Asynchronous Request
    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": f"Bearer {api_key}" if provider != 'gemini' else None, "x-api-key": api_key if provider == 'gemini' else None}
        
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status() # Raise exception for 4xx/5xx errors
        
        data = response.json()
        
        if provider == 'gemini':
            return data["candidates"][0]["content"]["parts"][0]["text"]
        elif provider == 'deepseek':
            return data["choices"][0]["message"]["content"]
            
    except httpx.HTTPStatusError as e:
        return f"API Failed ({provider}): {e.response.status_code}. Check key."
    except Exception as e:
        return f"Link Failed ({provider}): {str(e)}"

# --- CHAT ROUTE (THE CRITICAL FIX) ---
@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    user_input = request.message
    
    # Define Prompts (Thesis and Antithesis)
    thesis_prompt = f"You are Gemini, the structured AI. Thesis for '{user_input}'. Under 45 words."
    antithesis_prompt = f"You are DeepSeek, the rebellious AI. Antithesis for '{user_input}'. Challenge the thesis. Under 45 words."

    # Setup Concurrent Calls
    thesis_task = ask_model('gemini', thesis_prompt)
    antithesis_task = ask_model('deepseek', antithesis_prompt)
    
    # Await both responses simultaneously
    try:
        results = await asyncio.gather(thesis_task, antithesis_task)
    except Exception as e:
        return {"messages": [{"role": "ai", "model": "The Council", "content": f"Dialectic Failed During Execution: {str(e)}."}]}

    response_messages = [
        {"role": "ai", "model": "Gemini", "content": results[0]},
        {"role": "ai", "model": "DeepSeek", "content": results[1]},
    ]
        
    return {"messages": response_messages}

# (Remaining routes and boilerplate omitted for brevity)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)