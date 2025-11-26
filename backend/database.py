from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from passlib.context import CryptContext

# 1. Setup SQLite Database
DATABASE_URL = "sqlite:///./janus_forge.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Security (Password Hashing)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 3. Define the User Table
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    tier = Column(String, default="free") 
    created_at = Column(DateTime, default=datetime.utcnow)

# 4. Helper Functions

def init_db():
    """Creates the database tables if they don't exist."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)
