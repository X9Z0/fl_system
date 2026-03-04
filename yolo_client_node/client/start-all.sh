#!/bin/bash
# Master script to start both backend and frontend

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     FEDERATED LEARNING CLIENT NODE - FIRE DETECTION           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if aggregator is running
echo "Checking aggregator server..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Aggregator is running"
else
    echo "⚠️  Aggregator not detected at http://localhost:8000"
    echo "   Make sure to start the aggregator server first!"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Starting client node components..."
echo ""

# Start backend in background
echo "1️⃣  Starting Python backend (port 5000)..."
cd backend
./start.sh > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start
echo "   Waiting for backend to initialize..."
for i in {1..10}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo "   ✅ Backend is ready"
        break
    fi
    sleep 1
done

echo ""

# Start frontend in foreground
echo "2️⃣  Starting Next.js frontend (port 3000)..."
echo ""
cd frontend
./start.sh

# Cleanup on exit
echo ""
echo "Shutting down..."
kill $BACKEND_PID 2>/dev/null
echo "Done."
