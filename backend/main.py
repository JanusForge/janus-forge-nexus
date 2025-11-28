import os
import random
import asyncio
import httpx
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
# Removed OpenAI/Anthropic imports to simplify dependencies

# --- DATABASE IMPORTS ---
from database import init_db, get_db, User, verify_password, get_password_hash, SessionLocal

# --- GLOBAL STATE ---
load_dotenv()
clients = {} 
db_initialized = False
executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)

print("🚀 Starting Janus Forge Nexus Brain...")

app = FastAPI(title="Janus Forge Nexus API")

# --- CONFIGURATION ---
origins = ["*"] 
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

# --- LAZY INIT FUNCTION (Run this only when needed) ---
def init_core_services():
    global db_initialized, clients
    
    # 1. Database Setup (Only once)
    if not db_initialized:
        try:
            init_db()
            db = SessionLocal()
            if not db.query(User).filter(User.email == "admin@janusforge.ai").first():
                print("🆕 Creating Admin User: admin@janusforge.ai / Cassielw2050*bound")
                admin_user = User(email="admin@janusforge.ai", full_name="Cassandra Williamson (founder)", hashed_password=get_password_hash("admin123"), tier="visionary")
                db.add(admin_user)
                db.commit()
            print("✅ Database Ready")
            db_initialized = True
            db.close()
        except Exception as e:
            print(f"❌ DB Init Error: {e}")

    # 2. AI Client Setup (Only once)
    if 'gemini' not in clients:
        GEMINI_KEY = os.getenv("GEMINI_API_KEY")
        if GEMINI_KEY:
            try:
                genai.configure(api_key=GEMINI_KEY)
                clients['gemini'] = genai.GenerativeModel('gemini-2.0-flash') 
                print("✅ Gemini Configured")
            except Exception as e:
                print(f"❌ Gemini Init Error: {e}")
        
        DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY")
        if DEEPSEEK_KEY:
            # DeepSeek uses direct HTTPX, no client init needed here, but we mark it as ready
            clients['deepseek'] = True 
            print("✅ DeepSeek Configured")

# --- AI HELPER (HTTPX for DeepSeek) ---
async def ask_model(provider: str, prompt: str, system_role: str = ""):
    try:
        if provider == 'gemini':
            if 'gemini' not in clients: return "Error: Gemini Not Initialized"
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(executor, clients['gemini'].generate_content, f"{system_role}\n\n{prompt}")
            return response.text
        
        elif provider == 'deepseek':
            DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY")
            if not DEEPSEEK_KEY: return "Error: DeepSeek Key Missing"
            
            url = "https://api.deepseek.com/chat/completions"
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {DEEPSEEK_KEY}"}
            payload = {
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": system_role}, {"role": "user", "content": prompt}],
                "stream": False
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=60.0)
                if response.status_code != 200: return f"DeepSeek Error: {response.status_code}"
                return response.json()['choices'][0]['message']['content']
        else:
            return f"Error: Provider {provider} not found."

    except Exception as e:
        print(f"❌ AI Error ({provider}): {e}")
        return f"Neural Link Failed ({provider}): {str(e)}"

# --- ROUTES ---
class Message(BaseModel): role: str; content: str; model: Optional[str] = None
class ChatRequest(BaseModel): message: str; mode: str = "standard"; history: List[Message] = []
class CheckoutRequest(BaseModel): tier: str
class LoginSchema(BaseModel): username: str; password: str
class SignupSchema(BaseModel): email: str; password: str; full_name: str

@app.post("/api/v1/auth/signup")
async def signup(data: SignupSchema, db: Session = Depends(get_db)):
    # Lazy Init on first auth request
    if not db_initialized:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, init_core_services)
        
    if db.query(User).filter(User.email == data.email).first(): raise HTTPException(status_code=400, detail="Email registered")
    user = User(email=data.email, full_name=data.full_name, hashed_password=get_password_hash(data.password), tier="free")
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": f"user_{user.id}", "user": {"email": user.email, "full_name": user.full_name, "tier": user.tier}}

@app.post("/api/v1/auth/login")
async def login(data: LoginSchema, db: Session = Depends(get_db)):
    # Lazy Init on first login request
    if not db_initialized:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, init_core_services)

    user = db.query(User).filter(User.email == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password): raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"access_token": f"user_{user.id}", "user": {"email": user.email, "full_name": user.full_name, "tier": user.tier}}

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    # Lazy Init on first chat request
    if not db_initialized or not clients:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, init_core_services)
    
    user_input = request.message
    thesis_prompt = f"You are Gemini. Thesis for: '{user_input}'. <45 words."
    antithesis_prompt = f"You are DeepSeek. Antithesis for: '{user_input}'. <45 words."
    
    try:
        results = await asyncio.gather(
            ask_model('gemini', thesis_prompt),
            ask_model('deepseek', antithesis_prompt)
        )
        return {"messages": [
            {"role": "ai", "model": "Gemini", "content": results[0]},
            {"role": "ai", "model": "DeepSeek", "content": results[1]}
        ]}
    except Exception as e:
        return {"messages": [{"role": "ai", "model": "System", "content": f"Error: {str(e)}"}]}

@app.get("/api/v1/daily/latest")
async def get_daily_forge():
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "topic": "The Singularity: Threat or Evolution?",
        "messages": [
            {"role": "Gemini", "text": "Evolution is inevitable. Merging with synthetic intelligence is the only path to stellar expansion."},
            {"role": "DeepSeek", "text": "The threat isn't the AI. It's who controls the AI. Centralized singularity is tyranny."},
        ]
    }

@app.post("/api/v1/payments/create-checkout")
async def create_checkout(request: CheckoutRequest):
    # Force the live key
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    # HARDCODED PRICE IDs (To guarantee they are found)
    # Pro ($29)
    price_scholar = "price_1SVxLeGg8RUnSFObKobkPrcE"
    # Visionary ($99)
    price_visionary = "price_1SVxMEGg8RUnSFObB08Qfs7I"
    
    target_price = price_scholar if request.tier == 'pro' else price_visionary

    print(f"💳 Initiating Stripe Checkout for {request.tier} using {target_price}")

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': target_price, 'quantity': 1}],
            mode='subscription',
            # Ensure these URLs are exactly your domain
            success_url='https://janusforge.ai/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://janusforge.ai/dashboard',
        )
        print(f"✅ Checkout URL created: {checkout_session.url}")
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"❌ Stripe Error: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)