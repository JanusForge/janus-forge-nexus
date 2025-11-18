import psycopg2
import os

def setup_database():
    print("🚀 INITIATING GLOBAL CONVERSATION INFRASTRUCTURE...")
    
    # Initialize conn to None to fix scope issue
    conn = None
    
    try:
        # Check if DATABASE_URL exists
        if 'DATABASE_URL' not in os.environ:
            print("⚠️ DATABASE_URL not set - skipping database setup")
            return
            
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        schema = """
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) DEFAULT 'anonymous',
            title VARCHAR(500) DEFAULT 'New Session',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_session_id ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_session_updated ON sessions(updated_at);
        """
        
        cur.execute(schema)
        conn.commit()
        print("✅ ELITE SCHEMA DEPLOYED: Global conversation infrastructure ready")
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
    finally:
        # Only close if conn was successfully created
        if conn:
            conn.close()
