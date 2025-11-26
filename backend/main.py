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

# --- GLOBAL STATE ---
load_dotenv()
clients = {} 
print("🚀 Starting Janus Forge Nexus Brain...")

app = FastAPI(title="Janus Forge Nexus API")

# --- LIFESPAN HOOKS (CRITICAL FIX FOR CLOUD RUN STARTUP) ---

@app.on_event("startup")
async def init_core_services():
    """Initializes all external AI clients and the database tables asynchronously."""
    
    # Use ThreadPoolExecutor for synchronous tasks (DB, Gemini setup)
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=5)
    loop = asyncio.get_event_loop()
    
    def sync_setup():
        # 1. Initialize Database Tables (MUST be done first)
        init_db()
        
        # 2. Create Admin User (Synchronous DB write)
        db = SessionLocal()
        try:
            if not db.query(User).filter(User.email == "admin@janus.com").first():
                print("🆕 Creating Admin User: admin@janus.com / admin123")
                admin_user = User(
                    email="admin@janus.com",
                    full_name="Janus Admin",
                    hashed_password=get_password_hash("admin123"),
                    tier="visionary"
                )
                db.add(admin_user)
                db.commit()
            else:
                print("✅ Admin User Exists")
        finally:
            db.close()
            
        # 3. Setup Gemini (Synchronous API client init)
        GEMINI_KEY = os.getenv("GEMINI_API_KEY")
        if GEMINI_KEY:
            genai.configure(api_key=GEMINI_KEY)
            clients['gemini'] = genai.GenerativeModel('gemini-2.0-flash') 
            print("✅ Gemini Configured")

    # Run the synchronous database/gemini setup without blocking server startup
    await loop.run_in_executor(executor, sync_setup)

    # 4. Setup Asynchronous Clients (DeepSeek)
    if os.getenv("DEEPSEEK_API_KEY"):
        clients['deepseek'] = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com/v1" 
        )
        print("✅ DeepSeek Configured")
    
    print("✅ All Core Services Initialized.")

# --- CONFIGURATION (Unchanged) ---
origins = ["*"] 
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Setup Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

# --- HELPER: Universal AI Translator (No change) ---
async def ask_model(provider: str, prompt: str, system_role: str = ""):
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
    thesis_task = ask_model('gemini', thesis_prompt, system_role="")
    antithesis_task = ask_model('deepseek', antithesis_prompt, system_role="")
    
    # 3. Await both responses simultaneously
    try:
        results = await asyncio.gather(thesis_task, antithesis_task)
    except Exception as e:
        return {"messages": [{"role": "ai", "model": "The Council", "content": f"Dialectic Failed During Execution: {str(e)}."}]}


    # 4. Return both messages in the response array
    response_messages = [
        {"role": "ai", "model": "Gemini", "content": results[0]},
        {"role": "ai", "model": "DeepSeek", "content": results[1]},
    ]
        
    return {"messages": response_messages}

# --- DAILY FORGE / STRIPE (Unchanged) ---
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