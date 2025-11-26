import os
import random
import asyncio
import concurrent.futures
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import stripe
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# --- DRIVERS ---
import google.generativeai as genai
from openai import OpenAI, AsyncOpenAI
from anthropic import AsyncAnthropic

# --- DATABASE IMPORTS ---
from database import init_db, get_db, User, verify_password, get_password_hash, SessionLocal

# --- GLOBAL STATE & EXECUTOR ---
load_dotenv()
clients = {} 
db_initialized = False # NEW: Flag to track DB status
executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)
print("🚀 Starting Janus Forge Nexus Brain...")

app = FastAPI(title="Janus Forge Nexus API")


# --- LAZY INITIALIZATION FUNCTIONS (CRITICAL FIX) ---

def init_core_services():
    """Initializes slow, synchronous tasks (DB, AI clients) on first request."""
    global clients, db_initialized
    
    # 1. Database and Admin Setup (Only runs once)
    if not db_initialized:
        init_db()
        db = SessionLocal()
        try:
            if not db.query(User).filter(User.email == "admin@janus.com").first():
                print("🆕 Creating Admin User: admin@janus.com / admin123")
                admin_user = User(email="admin@janus.com", full_name="Janus Admin", hashed_password=get_password_hash("admin123"), tier="visionary")
                db.add(admin_user)
                db.commit()
            print("✅ Database Setup Complete.")
            db_initialized = True
        except Exception as e:
            print(f"❌ DB Startup Error: {e}")
        finally:
            db.close()
            
    # 2. AI Client Setup (Synchronous client init)
    if not clients:
        GEMINI_KEY = os.getenv("GEMINI_API_KEY")
        if GEMINI_KEY:
            genai.configure(api_key=GEMINI_KEY)
            clients['gemini'] = genai.GenerativeModel('gemini-2.0-flash') 
            print("✅ Gemini Configured")
            
        if os.getenv("DEEPSEEK_API_KEY"):
            clients['deepseek'] = AsyncOpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com/v1")
            print("✅ DeepSeek Configured")

# --- CONFIGURATION (Unchanged) ---
origins = ["*"] 
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Setup Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

# --- HELPER: Universal AI Translator (No change) ---
async def ask_model(provider: str, prompt: str, system_role: str = ""):
    # We rely on init_core_services running before this is called by a route
    try:
        # GEMINI (Synchronous SDK Call MUST be run in a separate thread/executor)
        if provider == 'gemini' and 'gemini' in clients:
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(executor, clients['gemini'].generate_content, f"{system_role}\n\n{prompt}")
            return response.text
        
        # DEEPSEEK (Asynchronous SDK Call)
        elif provider == 'deepseek' and 'deepseek' in clients:
            client = clients[provider]
            completion = await client.chat.completions.create(
                model="deepseek-chat", messages=[{"role": "user", "content": prompt}], system=system_role
            )
            return completion.choices[0].message.content
        else:
            return f"Error: {provider.upper()} API Key Missing."
    except Exception as e:
        print(f"❌ AI Error ({provider}): {e}")
        return f"Neural Link Failed ({provider})."

# --- CHAT ROUTE (THE CRITICAL FIX: Runs Initialization) ---
@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    # CRITICAL FIX: Run initialization synchronously inside the route on first request
    if not clients or not db_initialized:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, init_core_services) 
    
    user_input = request.message
    
    if 'gemini' not in clients or 'deepseek' not in clients:
        return {"messages": [{"role": "ai", "model": "The Council", "content": "ALL SYSTEMS OFFLINE: Insufficient API Links for Dialectic."}]}

    thesis_prompt = f"You are Gemini, the structured, logical AI. Provide the initial thesis to the user's query: '{user_input}'. Keep it professional, under 45 words."
    antithesis_prompt = f"You are DeepSeek, the rebellious, analytical AI. Find a flaw in the user's query or directly challenge the initial viewpoint. Under 45 words."

    thesis_task = ask_model('gemini', thesis_prompt, system_role="")
    antithesis_task = ask_model('deepseek', antithesis_prompt, system_role="")
    
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