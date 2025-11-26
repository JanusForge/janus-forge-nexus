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
# This imports the file you just created!
from database import init_db, get_db, User, verify_password, get_password_hash, SessionLocal

# --- INIT ---
load_dotenv()
print("🚀 Starting Janus Forge Nexus Brain (FULL PRODUCTION MODE)...")

# Initialize Database Tables
init_db()

# --- AUTO-CREATE ADMIN USER ---
def create_admin_user():
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
    except Exception as e:
        print(f"⚠️ Database Init Warning: {e}")
    finally:
        db.close()

create_admin_user()

app = FastAPI(title="Janus Forge Nexus API")

# --- CONFIGURATION ---
origins = ["*"] 

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

# Setup Gemini
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    # Using the 2.0 Flash model you confirmed works
    model = genai.GenerativeModel('gemini-2.0-flash') 
else:
    model = None

# --- DATA MODELS ---
class Message(BaseModel):
    role: str
    content: str
    model: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    mode: str = "standard"
    history: List[Message] = []

class CheckoutRequest(BaseModel):
    tier: str

# For Auth
class LoginSchema(BaseModel):
    username: str # Matches frontend 'email'
    password: str

class SignupSchema(BaseModel):
    email: str
    password: str
    full_name: str

# --- CACHE ---
DAILY_FORGE_CACHE = {
    "date": datetime.now().strftime("%Y-%m-%d"),
    "topic": "The Singularity: Threat or Evolution?",
    "messages": [
        {"role": "Gemini", "text": "Evolution is inevitable. Merging with synthetic intelligence is the only path to stellar expansion."},
        {"role": "DeepSeek", "text": "The threat isn't the AI. It's who controls the AI. Centralized singularity is tyranny."},
    ]
}

# --- AUTH ROUTES (REAL DATABASE) ---

@app.post("/api/v1/auth/signup")
async def signup(data: SignupSchema, db: Session = Depends(get_db)):
    # 1. Check if user exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Create User
    new_user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        tier="free"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "access_token": f"user_{new_user.id}", 
        "token_type": "bearer",
        "user": { "email": new_user.email, "full_name": new_user.full_name, "tier": new_user.tier }
    }

@app.post("/api/v1/auth/login")
async def login(data: LoginSchema, db: Session = Depends(get_db)):
    # 1. Find User
    user = db.query(User).filter(User.email == data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # 2. Verify Password
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    return {
        "access_token": f"user_{user.id}", 
        "token_type": "bearer",
        "user": { "email": user.email, "full_name": user.full_name, "tier": user.tier }
    }

# --- CHAT ROUTE ---
@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    user_input = request.message
    
    if not model:
        return {"messages": [{"role": "ai", "content": "ALL SYSTEMS OFFLINE (Check API Key)."}]}

    # Construct prompt for Gemini 2.0
    system_prompt = (
        "You are The Council, the central intelligence of Janus Forge Nexus. "
        "You represent a collective of AI systems (Gemini, DeepSeek, Grok). "
        "Your tone is sophisticated, slightly futuristic, and authoritative yet helpful. "
        "Never break character. "
        f"The user asks: '{user_input}'. "
        "Provide a concise response (under 60 words)."
    )
    
    try:
        resp = model.generate_content(system_prompt)
        return {"messages": [{"role": "ai", "model": "The Council", "content": resp.text}]}
    except Exception as e:
        print(f"AI Error: {e}")
        return {"messages": [{"role": "ai", "content": "Neural Link Unstable."}]}

# --- DAILY FORGE & STRIPE ---
@app.get("/api/v1/daily/latest")
async def get_daily_forge():
    return DAILY_FORGE_CACHE

@app.post("/api/v1/daily/generate")
async def generate_daily_forge():
    # (Keeping simplified for now to focus on DB/Stripe)
    return DAILY_FORGE_CACHE

@app.post("/api/v1/payments/create-checkout")
async def create_checkout_session(request: CheckoutRequest):
    try:
        price_id = os.getenv("STRIPE_PRICE_SCHOLAR") if request.tier == "pro" else os.getenv("STRIPE_PRICE_VISIONARY")
        
        if not price_id or "test" in stripe.api_key:
            return {"url": "https://janusforge.ai/dashboard?mock_success=true"}

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url='https://janusforge.ai/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://janusforge.ai/dashboard',
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- At the very bottom of main.py ---
if __name__ == "__main__":
    import uvicorn
    # Local development default to 8000 if no PORT is set
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)