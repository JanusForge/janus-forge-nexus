# Replace the password functions in app.py with these:

# --- AUTH UTILS ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_hash(password):
    # Truncate password to 72 bytes for bcrypt compatibility
    if isinstance(password, str):
        password = password.encode('utf-8')
    # Truncate to 72 bytes maximum
    truncated_password = password[:72]
    return pwd_context.hash(truncated_password)
