from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uvicorn
import requests
import json
from datetime import datetime, timedelta, date
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv
# --- STRIPE IMPORTS ---
import stripe
from typing import Union
# --- LOAD ENVIRONMENT VARIABLES ---
load_dotenv()
# --- OPTIONAL IMPORTS ---
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ google-generativeai not installed")
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai not installed")
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("⚠️ anthropic not installed")
# --- SECURITY CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "janus_forge_super_secret_key_2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
# --- API KEYS ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
GROK_API_KEY = os.getenv('GROK_API_KEY')
# --- STRIPE SETUP ---
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
if STRIPE_SECRET_KEY:
    try:
        stripe.api_key = STRIPE_SECRET_KEY
    except Exception as e:
        print(f"⚠️ FATAL STRIPE CONFIGURATION CRASH: {e}")
        # The application will continue running, but Stripe operations will fail gracefully later.
else:
    print("⚠️ STRIPE_SECRET_KEY missing")
# --- GEMINI SETUP ---
valid_gemini_models = []
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_gemini_models.append(m.name.replace('models/', ''))
    except Exception as e:
        print(f"⚠️ Gemini Config Error: {e}")
# --- DATABASE SETUP ---
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
# Define Base first
Base = declarative_base()
# --- MODELS ---
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    tier = Column(String, default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    stripe_customer_id = Column(String, nullable=True)
    subscription_id = Column(String, nullable=True)
class SessionDB(Base):
    __tablename__ = "sessions"
    session_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer)
    messages = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
class DailySessionDB(Base):
    __tablename__ = "daily_sessions"
    id = Column(Integer, primary_key=True, index=True)
    date_key = Column(Date, unique=True, index=True)
    topic = Column(String)
    messages = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
# Try Postgres, fallback to SQLite
try:
    is_sqlite = DATABASE_URL and 'sqlite' in DATABASE_URL.lower()
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine = create_engine(DATABASE_URL if DATABASE_URL else "sqlite:////tmp/janus_forge.db",
                           connect_args=connect_args)
    Base.metadata.create_all(bind=engine)
    print("✅ DB tables created" + (" (SQLite)" if is_sqlite else " (Postgres)"))
except Exception as e:
    print(f"⚠️ Postgres connection failed ({e}), falling back to SQLite for local dev")
    engine = create_engine("sqlite:////tmp/janus_forge_local.db",
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    print("✅ DB tables created (SQLite)")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# --- AUTH UTILS ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_hash(password): return pwd_context.hash(password)
def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError: raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if user is None: raise HTTPException(status_code=401, detail="User not found")
    return user
# --- AI CLIENTS & FUNCTIONS ---
openai_client = None
if OPENAI_AVAILABLE and OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception as e:
        print(f"⚠️ OpenAI Client Init Failed: {e}")
anthropic_client = None
if ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY:
    try:
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
    except Exception as e:
        print(f"⚠️ Anthropic Client Init Failed: {e}")
def call_gemini_api(prompt):
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY: return "⚠️ Gemini unavailable"
    models = [m for m in valid_gemini_models if 'flash' in m] + [m for m in valid_gemini_models if 'pro' in m] + ['gemini-1.5-flash-latest', 'gemini-pro']
    for m in models:
        try: return genai.GenerativeModel(m).generate_content(prompt).text
        except: continue
    return "❌ Gemini Error: All models failed."
def call_deepseek_api(prompt):
    if not DEEPSEEK_API_KEY: return "⚠️ DeepSeek Key missing"
    try:
        res = requests.post('https://api.deepseek.com/chat/completions',
                          headers={'Authorization': f'Bearer {DEEPSEEK_API_KEY}', 'Content-Type': 'application/json'},
                          json={"model": "deepseek-chat", "messages": [{"role": "user", "content": prompt}], "stream": False}, timeout=30)
        return res.json()['choices'][0]['message']['content'] if res.status_code == 200 else f"Error: {res.status_code}"
    except Exception as e: return f"Error: {e}"
def call_grok_api(prompt): return "🦄 Grok: API endpoint unreachable."
def call_openai_api(prompt):
    if not openai_client: return "⚠️ OpenAI unavailable"
    try: return openai_client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}]).choices[0].message.content
    except Exception as e: return f"Error: {e}"
def build_context_prompt(curr, prev, ai):
    hist = "\n".join([f"{'👤 User' if m['role'] == 'user' else '🤖 ' + (m.get('ai_name') or 'AI')}: {m['content']}" for m in prev[-6:]])
    return f"Participate in debate.\nHISTORY:\n{hist}\nPROMPT: {curr}\nRespond as {ai}."
def generate_daily_topic(): return call_gemini_api("Generate 1 provocative debate topic for AI. Output ONLY topic.")
def run_autonomous_debate(topic):
    msgs = []
    t = call_gemini_api(f"Topic: {topic}. Present THESIS. <100 words.")
    msgs.append({"role": "assistant", "ai_name": "gemini", "content": t, "timestamp": datetime.utcnow().isoformat()})
    a = call_deepseek_api(f"Topic: {topic}. Thesis: '{t}'. Present ANTITHESIS. <100 words.")
    msgs.append({"role": "assistant", "ai_name": "deepseek", "content": a, "timestamp": datetime.utcnow().isoformat()})
    s = call_gemini_api(f"Topic: {topic}. Thesis: '{t}'. Antithesis: '{a}'. Provide SYNTHESIS. <100 words.")
    msgs.append({"role": "assistant", "ai_name": "gemini", "content": s, "timestamp": datetime.utcnow().isoformat()})
    return msgs
# --- FASTAPI SETUP ---
# NEW CODE: Ensuring everything is defined after the FastAPI app is instantiated.
app = FastAPI(title="Janus Forge Nexus")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://janusforge-frontend.onrender.com",
        "https://janusforge.ai",
        "https://www.janusforge.ai",
        "http://localhost:3000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
# --- Pydantic ---
class UserCreate(BaseModel): email: str; password: str; full_name: str
class BroadcastRequest(BaseModel): session_id: str; ai_participants: List[str]; moderator_prompt: str
class Token(BaseModel): access_token: str; token_type: str; user_tier: str; user_name: str
class Message(BaseModel): role: str; content: str; timestamp: str; ai_name: Optional[str] = None
class BroadcastResponse(BaseModel): session_id: str; responses: List[Message]; timestamp: str
class DailySessionResponse(BaseModel): id: int; date: str; topic: str; messages: List[Message]
class HistoryItem(BaseModel): session_id: str; created_at: datetime; message_count: int; snippet: str
# --- STRIPE MODELS ---
class CheckoutRequest(BaseModel):
    tier: str # 'pro' or 'enterprise'
class PaymentStatus(BaseModel):
    tier: str
    subscription_id: Optional[str] = None
    is_active: bool = False
# --- ROUTES ---
@app.post("/api/auth/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(UserDB).filter(UserDB.email == user.email).first(): raise HTTPException(400, "Email registered")
    new_user = UserDB(email=user.email, hashed_password=get_hash(user.password), full_name=user.full_name)
    db.add(new_user); db.commit(); db.refresh(new_user)
    return {"access_token": create_access_token({"sub": new_user.email}), "token_type": "bearer", "user_tier": new_user.tier, "user_name": new_user.full_name}
@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password): raise HTTPException(401, "Incorrect credentials")
    return {"access_token": create_access_token({"sub": user.email}), "token_type": "bearer", "user_tier": user.tier, "user_name": user.full_name}
@app.post("/api/v1/broadcast", response_model=BroadcastResponse)
async def broadcast(req: BroadcastRequest, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    db_session = db.query(SessionDB).filter(SessionDB.session_id == req.session_id).first()
    if not db_session:
        db_session = SessionDB(session_id=req.session_id, user_id=user.id, messages=[])
        db.add(db_session)
    msgs = list(db_session.messages) if db_session.messages else []
    msgs.append({"role": "user", "content": req.moderator_prompt, "timestamp": datetime.utcnow().isoformat(), "ai_name": None})
    new_resp = []
    for ai in req.ai_participants:
        try:
            prompt = build_context_prompt(req.moderator_prompt, msgs, ai)
            txt = call_gemini_api(prompt) if ai == 'gemini' else call_deepseek_api(prompt) if ai == 'deepseek' else call_grok_api(prompt) if ai == 'grok' else call_openai_api(prompt) if ai == 'openai' else "..."
            ai_msg = {"role": "assistant", "content": txt, "timestamp": datetime.utcnow().isoformat(), "ai_name": ai}
            new_resp.append(ai_msg); msgs.append(ai_msg)
        except: pass
    db_session.messages = msgs; db.commit()
    return BroadcastResponse(session_id=req.session_id, responses=[Message(**m) for m in new_resp], timestamp=datetime.utcnow().isoformat())
@app.get("/api/v1/daily/latest", response_model=Optional[DailySessionResponse])
def get_latest_daily(db: Session = Depends(get_db)):
    d = db.query(DailySessionDB).filter(DailySessionDB.date_key == date.today()).first() or db.query(DailySessionDB).order_by(DailySessionDB.date_key.desc()).first()
    return DailySessionResponse(id=d.id, date=d.date_key.isoformat(), topic=d.topic, messages=[Message(**m) for m in d.messages]) if d else None
@app.post("/api/v1/daily/generate", response_model=DailySessionResponse)
def trigger_daily_debate(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(DailySessionDB).filter(DailySessionDB.date_key == date.today()).first(): raise HTTPException(400, "Exists")
    topic = generate_daily_topic(); msgs = run_autonomous_debate(topic)
    new_d = DailySessionDB(date_key=date.today(), topic=topic, messages=msgs)
    db.add(new_d); db.commit(); db.refresh(new_d)
    return DailySessionResponse(id=new_d.id, date=new_d.date_key.isoformat(), topic=new_d.topic, messages=[Message(**m) for m in msgs])
# --- NEW HISTORY ROUTE ---
@app.get("/api/v1/history", response_model=List[HistoryItem])
def get_history(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(SessionDB).filter(SessionDB.user_id == user.id).order_by(SessionDB.created_at.desc()).all()
    history = []
    for s in sessions:
        snippet = "Empty Session"
        if s.messages and len(s.messages) > 0:
            first_user_msg = next((m for m in s.messages if m['role'] == 'user'), None)
            if first_user_msg: snippet = first_user_msg['content'][:50] + "..."
        history.append(HistoryItem(session_id=s.session_id, created_at=s.created_at, message_count=len(s.messages) if s.messages else 0, snippet=snippet))
    return history
@app.get("/api/v1/session/{session_id}", response_model=BroadcastResponse)
def get_session(session_id: str, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(SessionDB).filter(SessionDB.session_id == session_id, SessionDB.user_id == user.id).first()
    if not s: raise HTTPException(404, "Not found")
    return BroadcastResponse(session_id=s.session_id, responses=[Message(**m) for m in s.messages], timestamp=datetime.utcnow().isoformat())
# --- STRIPE PAYMENT ROUTES ---
@app.post("/api/v1/payments/create-checkout")
async def create_checkout_session(req: CheckoutRequest, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.tier not in ['pro', 'enterprise']:
        raise HTTPException(400, "Invalid tier")
    if not STRIPE_SECRET_KEY:
        raise HTTPException(500, "Stripe unavailable")
    try:
        # Create/retrieve customer
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(email=user.email)
            user.stripe_customer_id = customer.id
            db.commit()
        else:
            customer = stripe.Customer.retrieve(user.stripe_customer_id)
# Price IDs (create in Stripe Dashboard)
        price_map = {
            'pro': 'price_1SVxLeGg8RUnSFObKobkPrcE', # Your Pro
            'enterprise': 'price_1SVxMEGg8RUnSFObB08Qfs7I' # Your Enterprise
        }
        price_id = price_map[req.tier]
        # Create session
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url='https://janus-forge-frontend.onrender.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://janus-forge-frontend.onrender.com/cancel',
            metadata={'user_id': str(user.id), 'tier': req.tier}
        )
        return {'id': session.id}
    except Exception as e:
        raise HTTPException(500, f"Checkout error: {str(e)}")
@app.get("/api/v1/payments/status", response_model=PaymentStatus)
async def get_payment_status(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    is_active = bool(user.subscription_id) # Assume active if sub ID present
    return PaymentStatus(tier=user.tier, subscription_id=user.subscription_id, is_active=is_active)
@app.post("/api/v1/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = int(session.metadata['user_id'])
        tier = session.metadata['tier']
        user = db.query(UserDB).filter(UserDB.id == user_id).first()
        if user:
            user.tier = tier
            user.subscription_id = session.subscription
            db.commit()
    elif event['type'] == 'invoice.payment_succeeded':
        # Ensure tier stays active
        sub = event['data']['object'].subscription
        user_id = stripe.Customer.retrieve(sub.customer).metadata.get('user_id')
        if user_id:
            user = db.query(UserDB).filter(UserDB.id == int(user_id)).first()
            if user:
                user.tier = user.tier # Retain (or map from sub)
                db.commit()
    elif event['type'] in ['invoice.payment_failed', 'customer.subscription.deleted']:
        # Downgrade to free
        sub = event['data']['object'].subscription if 'subscription' in event['data']['object'] else event['data']['object'].subscription
        user_id = stripe.Customer.retrieve(sub.customer).metadata.get('user_id')
        if user_id:
            user = db.query(UserDB).filter(UserDB.id == int(user_id)).first()
            if user:
                user.tier = 'free'
                user.subscription_id = None
                db.commit()
    return {'status': 'success'}
@app.get("/")
def root():
    return {"message": "Janus Forge Nexus API is running. System Status: 🟢 Online"}
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
