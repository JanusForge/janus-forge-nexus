const setupDatabase = require('./database/setup');

// Initialize database on startup
setupDatabase().then(() => {
  console.log('🎯 JANUS FORGE NEXUS: Database infrastructure operational');
});

// Database initialization
const setupDatabase = require('./database/setup');
setupDatabase().then(() => {
  console.log('🎯 JANUS FORGE NEXUS: Database infrastructure operational');
});
