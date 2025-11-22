from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uvicorn
import requests
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv 

# --- LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

# --- OPTIONAL IMPORTS (Graceful degradation) ---
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

# --- GEMINI SETUP & DIAGNOSTICS ---
valid_gemini_models = []
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # List available models to debug 404 errors
        print("🔍 Checking available Gemini models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                # Clean model name (remove 'models/' prefix if present)
                m_name = m.name.replace('models/', '')
                valid_gemini_models.append(m_name)
        print(f"✅ Valid Gemini Models Found: {valid_gemini_models}")
    except Exception as e:
        print(f"⚠️ Gemini Config Error: {e}")

# --- SMART DATABASE SETUP ---
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print(f"🗄️ Connecting to Cloud Database: {DATABASE_URL.split('@')[1]}")
    engine = create_engine(DATABASE_URL)
else:
    print("🗄️ Using Local SQLite Database")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./janus_forge.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
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

class SessionDB(Base):
    __tablename__ = "sessions"
    session_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer)
    messages = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- AUTH UTILS ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_hash(password): return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if user is None: raise credentials_exception
    return user

# --- AI CLIENT INITIALIZATION ---
openai_client = OpenAI(api_key=OPENAI_API_KEY) if (OPENAI_AVAILABLE and OPENAI_API_KEY) else None
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY) if (ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY) else None

# --- AI CALL FUNCTIONS ---
def call_gemini_api(prompt):
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY: return "⚠️ Gemini unavailable (Key/Lib missing)"
    
    # Priority List: Validated models -> Flash -> Pro -> Legacy
    models_to_try = []
    
    # 1. Prefer models we confirmed exist on startup
    if valid_gemini_models:
        # Prefer flash, then pro
        flash_models = [m for m in valid_gemini_models if 'flash' in m]
        pro_models = [m for m in valid_gemini_models if 'pro' in m]
        models_to_try.extend(flash_models)
        models_to_try.extend(pro_models)
        
    # 2. Fallbacks if auto-discovery failed
    fallback_models = [
        'gemini-1.5-flash-latest', 
        'gemini-1.5-flash-001',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro-001',
        'gemini-pro'
    ]
    for m in fallback_models:
        if m not in models_to_try:
            models_to_try.append(m)
    
    errors = []
    
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            return model.generate_content(prompt).text
        except Exception as e:
            errors.append(f"{model_name}: {str(e)}")
            continue
            
    return f"❌ Gemini Error: All models failed. Details: {'; '.join(errors[:3])}..."

def call_deepseek_api(prompt):
    if not DEEPSEEK_API_KEY: return "⚠️ DeepSeek Key missing"
    try:
        headers = {'Authorization': f'Bearer {DEEPSEEK_API_KEY}', 'Content-Type': 'application/json'}
        data = {"model": "deepseek-chat", "messages": [{"role": "user", "content": prompt}], "stream": False}
        res = requests.post('https://api.deepseek.com/chat/completions', headers=headers, json=data, timeout=30)
        if res.status_code == 200: return res.json()['choices'][0]['message']['content']
        return f"❌ DeepSeek Error: {res.status_code} - {res.text}"
    except Exception as e: return f"❌ DeepSeek Error: {str(e)}"

def call_grok_api(prompt):
    if not GROK_API_KEY: return "⚠️ Grok Key missing"
    try:
        headers = {'Authorization': f'Bearer {GROK_API_KEY}', 'Content-Type': 'application/json'}
        # Updated endpoint for xAI
        data = {"model": "grok-beta", "messages": [{"role": "user", "content": prompt}], "stream": False}
        res = requests.post('https://api.x.ai/v1/chat/completions', headers=headers, json=data, timeout=30)
        if res.status_code == 200: return res.json()['choices'][0]['message']['content']
        return "🦄 Grok: API endpoint unreachable."
    except:
        return "🦄 Grok: API endpoint unreachable."

def call_openai_api(prompt):
    if not openai_client: return "⚠️ OpenAI unavailable"
    try:
        res = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}]
        )
        return res.choices[0].message.content
    except Exception as e: return f"❌ OpenAI Error: {str(e)}"

def build_context_prompt(current_prompt, previous_messages, ai_name):
    history = "\n".join([
        f"{'👤 User' if m['role'] == 'user' else '🤖 ' + (m.get('ai_name') or 'AI')}: {m['content']}"
        for m in previous_messages[-6:]
    ])
    return f"""
    You are participating in a debate on Janus Forge.
    HISTORY:
    {history}
    
    CURRENT PROMPT: {current_prompt}
    
    Respond as {ai_name}. Be insightful and concise.
    """

# --- FASTAPI APP ---
app = FastAPI(title="Janus Forge Nexus")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INPUT MODELS ---
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class BroadcastRequest(BaseModel):
    session_id: str
    ai_participants: List[str]
    moderator_prompt: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_tier: str
    user_name: str

class Message(BaseModel):
    role: str
    content: str
    timestamp: str
    ai_name: Optional[str] = None

class BroadcastResponse(BaseModel):
    session_id: str
    responses: List[Message]
    timestamp: str

# --- ROUTES ---
@app.post("/api/auth/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(UserDB).filter(UserDB.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = UserDB(email=user.email, hashed_password=get_hash(user.password), full_name=user.full_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"access_token": create_access_token({"sub": new_user.email}), "token_type": "bearer", "user_tier": new_user.tier, "user_name": new_user.full_name}

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    return {"access_token": create_access_token({"sub": user.email}), "token_type": "bearer", "user_tier": user.tier, "user_name": user.full_name}

@app.post("/api/v1/broadcast", response_model=BroadcastResponse)
async def broadcast(req: BroadcastRequest, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"🎤 {user.email} calling Council: {req.ai_participants}")
    
    # 1. Get or Create Session
    db_session = db.query(SessionDB).filter(SessionDB.session_id == req.session_id).first()
    if not db_session:
        db_session = SessionDB(session_id=req.session_id, user_id=user.id, messages=[])
        db.add(db_session)
    
    # 2. Prepare Messages (Careful with SQLite JSON list mutation)
    current_messages = list(db_session.messages) if db_session.messages else []
    
    # Add User Message
    current_messages.append({
        "role": "user", 
        "content": req.moderator_prompt, 
        "timestamp": datetime.utcnow().isoformat(),
        "ai_name": None
    })

    # 3. THE ORCHESTRATION LOOP
    new_responses = []
    for ai in req.ai_participants:
        try:
            # Generate Prompt
            final_prompt = build_context_prompt(req.moderator_prompt, current_messages, ai)
            
            # Call Specific AI
            response_text = ""
            if ai == 'gemini': response_text = call_gemini_api(final_prompt)
            elif ai == 'deepseek': response_text = call_deepseek_api(final_prompt)
            elif ai == 'grok': response_text = call_grok_api(final_prompt)
            elif ai == 'openai': response_text = call_openai_api(final_prompt)
            elif ai == 'anthropic': 
                response_text = "🧠 Claude is thinking..." 
            
            # Append Result
            ai_msg = {
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.utcnow().isoformat(),
                "ai_name": ai
            }
            new_responses.append(ai_msg)
            current_messages.append(ai_msg)
            
        except Exception as e:
            print(f"❌ Error invoking {ai}: {e}")

    # 4. Save to DB
    db_session.messages = current_messages
    db.commit() # Commit changes to persistence

    # 5. Return ONLY new responses to frontend (it already has the user message)
    return BroadcastResponse(
        session_id=req.session_id,
        responses=[Message(**m) for m in new_responses],
        timestamp=datetime.utcnow().isoformat()
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
