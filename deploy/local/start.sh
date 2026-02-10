#!/bin/bash
# Quick start script for local development

set -e

echo "🚀 Starting Azure IPAM Local Development Environment"
echo "=================================================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your Azure credentials before continuing."
    echo "   Required: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
    exit 1
fi

# Source environment variables
export $(grep -v '^#' .env | xargs)

# Install dependencies
echo "📦 Installing API dependencies..."
cd ../../api
npm install

echo "📦 Installing Frontend dependencies..."
cd ../frontend
npm install

# Check for Azure Functions Core Tools
if ! command -v func &> /dev/null; then
    echo "⚠️  Azure Functions Core Tools not found."
    echo "   Install with: npm install -g azure-functions-core-tools@4"
    echo ""
    echo "   Starting frontend only (with mock data)..."
    npm run dev
    exit 0
fi

# Start both API and Frontend
echo "🔧 Starting API server..."
cd ../api
npm start &
API_PID=$!

echo "🎨 Starting Frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Azure IPAM is running!"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:7071"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $API_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
