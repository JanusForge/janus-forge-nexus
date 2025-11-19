import psycopg2
import os

def recreate_tables():
    print("🧹 RECREATING DATABASE TABLES...")
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        # Drop and recreate tables with consistent schema
        cur.execute('DROP TABLE IF EXISTS messages CASCADE')
        cur.execute('DROP TABLE IF EXISTS sessions CASCADE')
        
        schema = """
        CREATE TABLE sessions (
            session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(255) DEFAULT 'anonymous',
            title VARCHAR(500) DEFAULT 'New Session',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_messages_session_id ON messages(session_id);
        CREATE INDEX idx_sessions_updated ON sessions(updated_at);
        """
        
        cur.execute(schema)
        conn.commit()
        print("✅ TABLES RECREATED: Clean UUID schema deployed")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    recreate_tables()
