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

# --- CONFIGURATION ---
origins = ["*"] 
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Stripe & AI Client Setup (CRITICAL FIX FOR DEEPSEEK URL)
clients = {}
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    clients['gemini'] = genai.GenerativeModel('gemini-2.0-flash') 
if os.getenv("DEEPSEEK_API_KEY"):
    clients['deepseek'] = AsyncOpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        # CRITICAL FIX: Ensure base URL includes /v1 for compatibility
        base_url="https://api.deepseek.com/v1" 
    )
    print("✅ DeepSeek Configured")

# --- HELPER: Universal AI Translator (Unchanged) ---
async def ask_model(provider: str, prompt: str, system_role: str = ""):
    try:
        if provider == 'gemini' and 'gemini' in clients:
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(executor, clients['gemini'].generate_content, f"{system_role}\n\n{prompt}")
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

# --- CHAT ROUTE (Final Corrected Logic) ---
@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
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

# --- REMAINING ROUTES (Unchanged) ---
@app.get("/api/v1/daily/latest")
async def get_daily_forge(): return DAILY_FORGE_CACHE
@app.post("/api/v1/payments/create-checkout")
async def create_checkout_session(request: CheckoutRequest):
    try:
        price_id = os.getenv("STRIPE_PRICE_SCHOLAR") if request.tier == "pro" else os.getenv("STRIPE_PRICE_VISIONARY")
        if not price_id or "test" in stripe.api_key: return {"url": "https://janusforge.ai/dashboard?mock_success=true"}
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'], line_items=[{'price': price_id, 'quantity': 1}], mode='subscription',
            success_url='https://janusforge.ai/dashboard?session_id={CHECKOUT_SESSION_ID}', cancel_url='https://janusforge.ai/dashboard',
        )
        return {"url": checkout_session.url}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)