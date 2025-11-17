const { Pool } = require('pg');

async function setupDatabase() {
  console.log('🚀 INITIATING GLOBAL CONVERSATION INFRASTRUCTURE...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const schema = `
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
    
    -- Conversation analytics foundation
    CREATE INDEX IF NOT EXISTS idx_message_timestamp ON messages(timestamp);
  `;

  try {
    await pool.query(schema);
    console.log('✅ ELITE SCHEMA DEPLOYED: Global conversation infrastructure ready');
  } catch (error) {
    console.error('❌ Schema deployment failed:', error);
    process.exit(1); // Fail deployment if schema fails
  } finally {
    await pool.end();
  }
}

module.exports = setupDatabase;
