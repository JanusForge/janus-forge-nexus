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
db_initialized = False  # Flag to track initialization status
executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)

print("🚀 Starting Janus Forge Nexus Brain...")

app = FastAPI(title="Janus Forge Nexus API")

# --- LAZY INITIALIZATION LOGIC ---
def ensure_initialized():
    """
    Initializes DB and AI clients if they haven't been set up yet.
    This runs on the first request, preventing startup timeouts.
    """
    global db_initialized, clients
    
    if db_initialized and clients:
        return  # Already done

    print("⚡ Lazy Initialization Started...")

    # 1. Database Setup
    if not db_initialized:
        init_db()
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
            print("✅ Database Ready")
            db_initialized = True
        except Exception as e:
            print(f"❌ DB Init Error: {e}")
        finally:
            db.close()

    # 2. AI Client Setup
    if not clients:
        # Gemini
        GEMINI_KEY = os.getenv("GEMINI_API_KEY")
        if GEMINI_KEY:
            genai.configure(api_key=GEMINI_KEY)
            clients['gemini'] = genai.GenerativeModel('gemini-2.0-flash')
            print("✅ Gemini Ready")

        # DeepSeek
        if os.getenv("DEEPSEEK_API_KEY"):
            clients['deepseek'] = AsyncOpenAI(
                api_key=os.getenv("DEEPSEEK_API_KEY"), 
                base_url="https://api.deepseek.com/v1"
            )
            print("✅ DeepSeek Ready")

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

# --- HELPER: Universal AI Translator ---
async def ask_model(provider: str, prompt: str, system_role: str = ""):
    try:
        # GEMINI (Run in Executor)
        if provider == 'gemini' and 'gemini' in clients:
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(
                    executor, 
                    clients['gemini'].generate_content, 
                    f"{system_role}\n\n{prompt}"
                )
            return response.text
        
        # DEEPSEEK (FIXED: System prompt moved inside messages)
        elif provider == 'deepseek' and 'deepseek' in clients:
            client = clients[provider]
            completion = await client.chat.completions.create(
                model="deepseek-chat", 
                messages=[
                    {"role": "system", "content": system_role}, # <-- MOVED HERE
                    {"role": "user", "content": prompt}
                ]
                # Removed the invalid 'system=system_role' argument
            )
            return completion.choices[0].message.content
            
        else:
            return f"Error: {provider.upper()} API Key Missing."
    except Exception as e:
        print(f"❌ AI Error ({provider}): {e}")
        return f"Neural Link Failed ({provider})."

# --- DATA MODELS ---
class Message(BaseModel): role: str; content: str; model: Optional[str] = None
class ChatRequest(BaseModel): message: str; mode: str = "standard"; history: List[Message] = []
class CheckoutRequest(BaseModel): tier: str
class LoginSchema(BaseModel): username: str; password: str
class SignupSchema(BaseModel): email: str; password: str; full_name: str

# --- ROUTES ---

@app.post("/api/v1/auth/signup")
async def signup(data: SignupSchema, db: Session = Depends(get_db)):
    ensure_initialized() # Lazy Init
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user: raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(email=data.email, full_name=data.full_name, hashed_password=get_password_hash(data.password), tier="free")
    db.add(new_user); db.commit(); db.refresh(new_user)
    return { "access_token": f"user_{new_user.id}", "token_type": "bearer", "user": { "email": new_user.email, "full_name": new_user.full_name, "tier": new_user.tier } }

@app.post("/api/v1/auth/login")
async def login(data: LoginSchema, db: Session = Depends(get_db)):
    ensure_initialized() # Lazy Init
    user = db.query(User).filter(User.email == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return { "access_token": f"user_{user.id}", "token_type": "bearer", "user": { "email": user.email, "full_name": user.full_name, "tier": user.tier } }

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    # CRITICAL: Ensure services are ready before processing chat
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, ensure_initialized)
    
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

@app.get("/api/v1/daily/latest")
async def get_daily_forge():
    ensure_initialized()
    return { "date": datetime.now().strftime("%Y-%m-%d"), "topic": "The Singularity: Threat or Evolution?", "messages": [{"role": "Gemini", "text": "Evolution is inevitable."}, {"role": "DeepSeek", "text": "The threat is who controls the AI."}] }

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