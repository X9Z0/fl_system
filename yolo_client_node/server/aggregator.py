from flask import Flask, request, jsonify, Response, stream_with_context
import threading
import time
import json
from collections import defaultdict
from queue import Queue
import sys
import os

# Add parent directory to path to import model_store
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server.model_store import init_store, get_global, update_global

app = Flask(__name__)

# Configuration
N_CLIENTS = 2  # Number of clients expected per round
AGGREGATION_TIMEOUT = 30  # seconds

# Storage for client updates
client_updates = defaultdict(list)  # round -> list of updates
update_lock = threading.Lock()

# SSE broadcast mechanism
sse_clients = []
sse_lock = threading.Lock()


class SSEClient:
    """Represents a connected SSE client"""
    def __init__(self):
        self.queue = Queue()


def broadcast_event(event_type, data):
    """Broadcast an event to all connected SSE clients"""
    message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    with sse_lock:
        for client in sse_clients:
            try:
                client.queue.put(message)
            except:
                pass


def fedavg(updates):
    """
    Perform Federated Averaging on a list of weight updates.
    
    Args:
        updates: List of weight dictionaries
        
    Returns:
        Averaged weights dictionary
    """
    if not updates:
        return {}
    
    # Get all layer names from first update
    layer_names = updates[0].keys()
    averaged_weights = {}
    
    for layer_name in layer_names:
        # Collect all weights for this layer
        layer_weights = [update[layer_name] for update in updates]
        
        # Check if all weights have the same length
        if len(set(len(w) for w in layer_weights)) != 1:
            print(f"Warning: Inconsistent lengths for layer {layer_name}")
            continue
        
        # Compute elementwise mean
        num_clients = len(layer_weights)
        weight_length = len(layer_weights[0])
        
        averaged_layer = []
        for i in range(weight_length):
            avg_value = sum(w[i] for w in layer_weights) / num_clients
            averaged_layer.append(avg_value)
        
        averaged_weights[layer_name] = averaged_layer
    
    return averaged_weights


def aggregate_round(round_num):
    """
    Aggregate updates for a specific round.
    
    Args:
        round_num: The round number to aggregate
    """
    with update_lock:
        if round_num not in client_updates or len(client_updates[round_num]) == 0:
            print(f"No updates to aggregate for round {round_num}")
            return
        
        updates = client_updates[round_num]
        print(f"Aggregating {len(updates)} updates for round {round_num}")
        
        # Extract just the weights from each update
        weights_list = [upd['weights'] for upd in updates]
        
        # Perform FedAvg
        averaged_weights = fedavg(weights_list)
        
        # Update global model
        new_state = update_global(averaged_weights)
        
        # Clear updates for this round
        del client_updates[round_num]
        
        # Broadcast aggregation event
        broadcast_event("aggregated", {
            "round": new_state['round'],
            "message": f"Aggregated round {round_num} with {len(updates)} clients",
            "new_weights": averaged_weights
        })
        
        print(f"Aggregation complete. New round: {new_state['round']}")


def check_and_aggregate():
    """Background thread to check if aggregation conditions are met"""
    round_timers = {}  # round -> timestamp of first update
    
    while True:
        time.sleep(1)  # Check every second
        
        with update_lock:
            current_global = get_global()
            current_round = current_global['round']
            
            # Check each round that has pending updates
            for round_num in list(client_updates.keys()):
                updates = client_updates[round_num]
                num_updates = len(updates)
                
                # Start timer if this is first update for this round
                if round_num not in round_timers and num_updates > 0:
                    round_timers[round_num] = time.time()
                
                # Check aggregation conditions
                should_aggregate = False
                
                # Condition 1: Received N updates
                if num_updates >= N_CLIENTS:
                    print(f"Round {round_num}: Received {num_updates}/{N_CLIENTS} updates - triggering aggregation")
                    should_aggregate = True
                
                # Condition 2: Timeout exceeded
                elif round_num in round_timers:
                    elapsed = time.time() - round_timers[round_num]
                    if elapsed >= AGGREGATION_TIMEOUT and num_updates > 0:
                        print(f"Round {round_num}: Timeout ({elapsed:.1f}s) - triggering aggregation with {num_updates} updates")
                        should_aggregate = True
                
                if should_aggregate:
                    # Remove timer
                    if round_num in round_timers:
                        del round_timers[round_num]
                    
                    # Aggregate in separate thread to avoid blocking
                    threading.Thread(target=aggregate_round, args=(round_num,), daemon=True).start()


@app.route('/send_update', methods=['POST'])
def send_update():
    """
    Receive a client update.
    
    Expected JSON:
    {
        "client_id": "c1",
        "round": 0,
        "weights": {
            "w1": [0.1, 0.0, 0.05],
            "w2": [0.0, 0.02]
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['client_id', 'round', 'weights']):
            return jsonify({"error": "Missing required fields: client_id, round, weights"}), 400
        
        client_id = data['client_id']
        round_num = data['round']
        weights = data['weights']
        
        # Store the update
        with update_lock:
            client_updates[round_num].append({
                'client_id': client_id,
                'weights': weights,
                'timestamp': time.time()
            })
            
            num_updates = len(client_updates[round_num])
            print(f"Received update from {client_id} for round {round_num} ({num_updates}/{N_CLIENTS})")
        
        # Broadcast new update event
        broadcast_event("update_received", {
            "client_id": client_id,
            "round": round_num,
            "total_updates": num_updates
        })
        
        return jsonify({
            "status": "success",
            "message": f"Update received from {client_id}",
            "round": round_num,
            "total_updates": num_updates
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/get_global', methods=['GET'])
def get_global_weights():
    """
    Return the current global model weights.
    
    Returns JSON:
    {
        "round": 0,
        "weights": {
            "w1": [0.0, 0.0, 0.0],
            "w2": [0.0, 0.0]
        }
    }
    """
    try:
        global_state = get_global()
        return jsonify(global_state), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/events')
def events():
    """
    Server-Sent Events (SSE) endpoint.
    Streams events about new updates and aggregations.
    """
    def event_stream():
        # Create new SSE client
        client = SSEClient()
        
        with sse_lock:
            sse_clients.append(client)
        
        try:
            # Send initial connection message
            yield f"event: connected\ndata: {json.dumps({'message': 'Connected to aggregator events'})}\n\n"
            
            # Stream events from queue
            while True:
                try:
                    message = client.queue.get(timeout=30)
                    yield message
                except:
                    # Send keepalive comment every 30 seconds
                    yield ": keepalive\n\n"
        finally:
            # Clean up on disconnect
            with sse_lock:
                if client in sse_clients:
                    sse_clients.remove(client)
    
    return Response(
        stream_with_context(event_stream()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


@app.route('/status', methods=['GET'])
def status():
    """
    Get server status including pending updates.
    """
    with update_lock:
        pending_updates = {
            round_num: len(updates) 
            for round_num, updates in client_updates.items()
        }
    
    global_state = get_global()
    
    return jsonify({
        "current_round": global_state['round'],
        "pending_updates": pending_updates,
        "expected_clients": N_CLIENTS,
        "timeout_seconds": AGGREGATION_TIMEOUT,
        "connected_sse_clients": len(sse_clients)
    }), 200


@app.route('/', methods=['GET'])
def index():
    """Simple info page"""
    return """
    <html>
    <head><title>Federated Learning Aggregator</title></head>
    <body>
        <h1>Federated Learning Fire Detection - Aggregator Server</h1>
        <h2>Endpoints:</h2>
        <ul>
            <li><strong>POST /send_update</strong> - Submit client updates</li>
            <li><strong>GET /get_global</strong> - Get current global weights</li>
            <li><strong>GET /events</strong> - SSE event stream</li>
            <li><strong>GET /status</strong> - Server status</li>
        </ul>
        <h2>Live Events:</h2>
        <div id="events" style="border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; font-family: monospace;">
            Connecting to event stream...
        </div>
        <script>
            const eventsDiv = document.getElementById('events');
            const eventSource = new EventSource('/events');
            
            eventSource.onopen = () => {
                eventsDiv.innerHTML = 'Connected!<br>';
            };
            
            eventSource.addEventListener('connected', (e) => {
                const data = JSON.parse(e.data);
                eventsDiv.innerHTML += `[CONNECTED] ${data.message}<br>`;
            });
            
            eventSource.addEventListener('update_received', (e) => {
                const data = JSON.parse(e.data);
                eventsDiv.innerHTML += `[UPDATE] Client ${data.client_id} - Round ${data.round} (${data.total_updates} updates)<br>`;
                eventsDiv.scrollTop = eventsDiv.scrollHeight;
            });
            
            eventSource.addEventListener('aggregated', (e) => {
                const data = JSON.parse(e.data);
                eventsDiv.innerHTML += `<strong>[AGGREGATED] ${data.message} - New round: ${data.round}</strong><br>`;
                eventsDiv.scrollTop = eventsDiv.scrollHeight;
            });
            
            eventSource.onerror = (e) => {
                eventsDiv.innerHTML += '[ERROR] Connection lost<br>';
            };
        </script>
    </body>
    </html>
    """


# Initialize the model store on startup
init_store()

# Start background aggregation checker thread
aggregation_thread = threading.Thread(target=check_and_aggregate, daemon=True)
aggregation_thread.start()

print(f"Aggregator configured: N_CLIENTS={N_CLIENTS}, TIMEOUT={AGGREGATION_TIMEOUT}s")

# For compatibility with uvicorn command style, but using Flask
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, threaded=True)
