#!/bin/bash
echo "🚀 INITIATING JANUS FORGE NEXUS STARTUP..."

# Run Node.js database setup
echo "📦 SETTING UP DATABASE INFRASTRUCTURE..."
node database/setup.js

# Start Python backend
echo "🐍 STARTING PYTHON BACKEND..."
uvicorn app:app --host 0.0.0.0 --port 8080
