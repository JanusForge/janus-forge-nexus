import os
import random
import asyncio
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

# --- INIT ---
load_dotenv()
print("🚀 Starting Janus Forge Nexus Brain (DIALECTIC ONLINE)...")
init_db()
def create_admin_user():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@janus.com").first():
            print("🆕 Creating Admin User: admin@janus.com / admin123")
            admin_user = User(email="admin@janus.com", full_name="Janus Admin", hashed_password=get_password_hash("admin123"), tier="visionary")
            db.add(admin_user)
            db.commit()
        else:
            print("✅ Admin User Exists")
    except Exception as e:
        print(f"⚠️ Database Init Warning: {e}")
    finally:
        db.close()
create_admin_user()

app = FastAPI(title="Janus Forge Nexus API")
origins = ["*"] 
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Stripe & AI Client Setup (Unchanged for brevity)
clients = {}
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    clients['gemini'] = genai.GenerativeModel('gemini-2.0-flash') 
if os.getenv("DEEPSEEK_API_KEY"):
    clients['deepseek'] = AsyncOpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")

# --- HELPER: Universal AI Translator ---
async def ask_model(provider: str, prompt: str, system_role: str = ""):
    try:
        if provider == 'gemini' and 'gemini' in clients:
            # We call the synchronous function inside an executor to avoid blocking FastAPI
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, clients['gemini'].generate_content, f"{system_role}\n\n{prompt}")
            return response.text
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

# --- DATA MODELS (Unchanged) ---
class Message(BaseModel): role: str; content: str; model: Optional[str] = None
class ChatRequest(BaseModel): message: str; mode: str = "standard"; history: List[Message] = []
class CheckoutRequest(BaseModel): tier: str
class LoginSchema(BaseModel): username: str; password: str
class SignupSchema(BaseModel): email: str; password: str; full_name: str
DAILY_FORGE_CACHE = { "date": datetime.now().strftime("%Y-%m-%d"), "topic": "The Singularity: Threat or Evolution?", "messages": [{"role": "Gemini", "text": "Evolution is inevitable."}, {"role": "DeepSeek", "text": "The threat is who controls the AI."}] }


# --- CHAT ROUTE (THE CRITICAL FIX) ---
@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    user_input = request.message
    
    if 'gemini' not in clients or 'deepseek' not in clients:
        return {"messages": [{"role": "ai", "model": "The Council", "content": "ALL SYSTEMS OFFLINE: Insufficient API Links for Dialectic."}]}

    # 1. Define Prompts (Roles)
    thesis_prompt = f"You are Gemini, the structured, logical AI. Provide the initial thesis to the user's query: '{user_input}'. Keep it professional, under 45 words."
    antithesis_prompt = f"You are DeepSeek, the rebellious, analytical AI. Find a flaw in the user's query or directly challenge the initial viewpoint. Under 45 words."

    # 2. Setup Concurrent Calls
    # NOTE: The helper function for Gemini is now wrapped in a loop.run_in_executor to make it awaitable.
    thesis_task = ask_model('gemini', thesis_prompt, system_role="")
    antithesis_task = ask_model('deepseek', antithesis_prompt, system_role="")
    
    # 3. Await both responses simultaneously
    try:
        results = await asyncio.gather(thesis_task, antithesis_task)
    except Exception as e:
        return {"messages": [{"role": "ai", "model": "The Council", "content": f"Dialectic Failed During Execution: {str(e)}."}]}


    # 4. Return both messages in the response array
    response_messages = [
        {"role": "ai", "model": "Gemini", "content": results[0], "role_color": "#00f3ff"},
        {"role": "ai", "model": "DeepSeek", "content": results[1], "role_color": "#bc13fe"},
    ]
        
    return {"messages": response_messages}
# (Remaining routes and main function omitted for brevity)