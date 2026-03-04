#!/bin/bash
# Start the aggregator server

echo "Starting Federated Learning Aggregator Server..."
echo "Server will be available at http://localhost:8000"
echo ""
echo "Endpoints:"
echo "  POST   /send_update  - Submit client updates"
echo "  GET    /get_global   - Get current global weights"
echo "  GET    /events       - SSE event stream"
echo "  GET    /status       - Server status"
echo "  GET    /             - Web interface"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 server/aggregator.py
