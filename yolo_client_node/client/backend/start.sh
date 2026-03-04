#!/bin/bash
# Start the Python backend

echo "Starting Federated Learning Client Backend..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
export CLIENT_ID=${CLIENT_ID:-client-1}
export CLIENT_PORT=${CLIENT_PORT:-5000}
export AGGREGATOR_HOST=${AGGREGATOR_HOST:-localhost}
export AGGREGATOR_PORT=${AGGREGATOR_PORT:-8000}

echo "Configuration:"
echo "  Client ID:      $CLIENT_ID"
echo "  Client Port:    $CLIENT_PORT"
echo "  Aggregator:     http://$AGGREGATOR_HOST:$AGGREGATOR_PORT"
echo ""

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt --break-system-packages
    echo ""
fi

echo "Starting server at http://localhost:$CLIENT_PORT"
echo "Press Ctrl+C to stop"
echo ""

python3 main.py
