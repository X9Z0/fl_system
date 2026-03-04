#!/bin/bash
# Start the Next.js frontend

echo "Starting Federated Learning Client UI..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (this may take a few minutes)..."
    npm install
    echo ""
fi

echo "Starting Next.js development server at http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
