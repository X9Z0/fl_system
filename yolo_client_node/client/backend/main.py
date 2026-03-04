"""
Federated Learning Client Backend
Handles YOLO inference, detection logic, and communication with aggregator
"""
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import time
import asyncio
import json
import base64
import io
import hashlib
import requests
from typing import List, Dict, Optional
from datetime import datetime
from collections import deque
import psutil
import os
from PIL import Image
import numpy as np

# Configuration
AGGREGATOR_HOST = os.getenv("AGGREGATOR_HOST", "localhost")
AGGREGATOR_PORT = os.getenv("AGGREGATOR_PORT", "8000")
CLIENT_ID = os.getenv("CLIENT_ID", "client-1")
CLIENT_PORT = int(os.getenv("CLIENT_PORT", "5000"))

# Detection thresholds
CONF_THR = 0.5
HIGH_CONF = 0.95
MIN_UPDATE_INTERVAL = 30  # seconds
HYSTERESIS_WINDOW = 5  # seconds
REQUIRED_FRAMES = 3  # frames needed within window

app = FastAPI(title="FL Client Backend")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
class ClientState:
    def __init__(self):
        self.last_update_time = 0
        self.detection_history = deque(maxlen=100)  # timestamp, conf
        self.current_round = 0
        self.global_weights = {"w1": [0.0, 0.0, 0.0], "w2": [0.0, 0.0]}
        self.update_count = 0
        self.total_detections = 0
        self.websocket_clients: List[WebSocket] = []
        self.yolo_model = None
        self.model_loaded = False

state = ClientState()

# Pydantic models
class InferRequest(BaseModel):
    image_b64: str

class TriggerUpdateRequest(BaseModel):
    reason: str = "manual"
    client_id: Optional[str] = None

class Detection(BaseModel):
    label: str
    conf: float
    bbox: List[float]

class InferResponse(BaseModel):
    timestamp: float
    detections: List[Dict]
    frame_w: int
    frame_h: int

# ============================================================================
# YOLO MODEL LOADING (MOCK FOR DEMO - Replace with real YOLO)
# ============================================================================

def load_yolo_model():
    """
    Load YOLO model. For demo purposes, we use a mock detector.
    In production, replace with:
    
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    
    or use ONNX runtime for faster inference.
    """
    print("Loading YOLO model (mock)...")
    # Mock model - replace with real YOLO
    state.model_loaded = True
    print("✅ Model loaded successfully (mock)")
    return None

def detect_fire_mock(image_array: np.ndarray) -> List[Dict]:
    """
    Mock fire detector for demo purposes.
    Replace with real YOLO inference:
    
    results = model.predict(image_array, conf=CONF_THR)
    detections = []
    for r in results:
        for box in r.boxes:
            detections.append({
                "label": r.names[int(box.cls)],
                "conf": float(box.conf),
                "bbox": box.xyxy[0].tolist()
            })
    """
    # Simulate detection with 30% probability
    import random
    
    if random.random() < 0.3:  # 30% chance of detecting fire
        h, w = image_array.shape[:2]
        # Random bounding box
        x1 = random.randint(0, w // 2)
        y1 = random.randint(0, h // 2)
        x2 = x1 + random.randint(50, w // 3)
        y2 = y1 + random.randint(50, h // 3)
        
        return [{
            "label": "fire",
            "conf": random.uniform(0.6, 0.95),
            "bbox": [x1, y1, x2, y2]
        }]
    
    return []

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def make_synthetic_delta(global_weights: Dict, client_id: str, timestamp: float) -> Dict:
    """
    Create synthetic weight delta for demo purposes.
    In production, this would be real gradient updates from local training.
    """
    delta = {}
    
    # Use deterministic but varied deltas based on client_id and time
    seed = hash(client_id + str(int(timestamp))) % 1000
    np.random.seed(seed)
    
    for layer_name, weights in global_weights.items():
        # Small random perturbations
        perturbation = np.random.randn(len(weights)) * 0.01
        delta[layer_name] = perturbation.tolist()
    
    return delta

def should_trigger_update() -> bool:
    """
    Decide if we should send an update based on detection history.
    Rules:
    1. Must wait MIN_UPDATE_INTERVAL since last update
    2. Need REQUIRED_FRAMES high-confidence detections within HYSTERESIS_WINDOW
       OR single detection > HIGH_CONF
    """
    current_time = time.time()
    
    # Rule 1: Check minimum interval
    if current_time - state.last_update_time < MIN_UPDATE_INTERVAL:
        return False
    
    # Rule 2: Check detection history
    recent_detections = [
        (ts, conf) for ts, conf in state.detection_history
        if current_time - ts < HYSTERESIS_WINDOW
    ]
    
    if not recent_detections:
        return False
    
    # Check for single high-confidence detection
    if any(conf > HIGH_CONF for _, conf in recent_detections):
        return True
    
    # Check for multiple medium-confidence detections
    if len(recent_detections) >= REQUIRED_FRAMES:
        return True
    
    return False

async def broadcast_to_websockets(message: Dict):
    """Send message to all connected WebSocket clients"""
    disconnected = []
    for ws in state.websocket_clients:
        try:
            await ws.send_json(message)
        except:
            disconnected.append(ws)
    
    # Remove disconnected clients
    for ws in disconnected:
        state.websocket_clients.remove(ws)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    state.yolo_model = load_yolo_model()
    
    # Fetch initial global weights
    try:
        await sync_global_weights()
        print(f"✅ Synced with aggregator, round: {state.current_round}")
    except Exception as e:
        print(f"⚠️  Could not sync with aggregator: {e}")

async def sync_global_weights():
    """Fetch latest global weights from aggregator"""
    try:
        response = requests.get(
            f"http://{AGGREGATOR_HOST}:{AGGREGATOR_PORT}/get_global",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            state.current_round = data.get("round", 0)
            state.global_weights = data.get("weights", state.global_weights)
            
            # Broadcast to UI
            await broadcast_to_websockets({
                "type": "global_update",
                "data": {
                    "round": state.current_round,
                    "weights": state.global_weights,
                    "timestamp": time.time()
                }
            })
            return data
    except Exception as e:
        print(f"Error syncing global weights: {e}")
        raise

@app.post("/infer")
async def infer_endpoint(file: Optional[UploadFile] = File(None), data: Optional[InferRequest] = None):
    """
    Run YOLO inference on uploaded frame.
    Accepts either multipart file upload or base64 JSON.
    """
    start_time = time.time()
    
    try:
        # Parse image
        if file:
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
        elif data and data.image_b64:
            image_data = base64.b64decode(data.image_b64)
            image = Image.open(io.BytesIO(image_data))
        else:
            return JSONResponse(
                status_code=400,
                content={"error": "No image provided"}
            )
        
        # Convert to numpy array
        image_array = np.array(image)
        frame_h, frame_w = image_array.shape[:2]
        
        # Run detection (mock or real YOLO)
        detections = detect_fire_mock(image_array)
        
        # Update detection history
        current_time = time.time()
        for det in detections:
            state.detection_history.append((current_time, det["conf"]))
            state.total_detections += 1
        
        # Check if we should trigger an update
        if detections and should_trigger_update():
            asyncio.create_task(trigger_update_background("detection"))
        
        # Calculate inference time
        inference_time = (time.time() - start_time) * 1000  # ms
        
        response = {
            "timestamp": current_time,
            "detections": detections,
            "frame_w": frame_w,
            "frame_h": frame_h,
            "inference_time_ms": inference_time
        }
        
        # Broadcast detection to WebSocket clients
        await broadcast_to_websockets({
            "type": "detection",
            "data": response
        })
        
        return response
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/global")
async def get_global():
    """
    Proxy to aggregator /get_global endpoint.
    Returns current global weights and round.
    """
    try:
        response = requests.get(
            f"http://{AGGREGATOR_HOST}:{AGGREGATOR_PORT}/get_global",
            timeout=5
        )
        return response.json()
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "error": "Aggregator unreachable",
                "details": str(e),
                "cached": {
                    "round": state.current_round,
                    "weights": state.global_weights
                }
            }
        )

@app.post("/trigger_update")
async def trigger_update_manual(request: TriggerUpdateRequest):
    """
    Manually trigger a weight update to the aggregator.
    Used for testing and forced updates.
    """
    client_id = request.client_id or CLIENT_ID
    
    try:
        result = await send_update_to_aggregator(request.reason, client_id)
        return {
            "status": "ok",
            "aggregator_resp": result,
            "client_id": client_id
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": str(e)}
        )

async def trigger_update_background(reason: str):
    """Background task to send update"""
    try:
        await send_update_to_aggregator(reason, CLIENT_ID)
    except Exception as e:
        print(f"Error sending update: {e}")

async def send_update_to_aggregator(reason: str, client_id: str) -> Dict:
    """
    Build weight update payload and send to aggregator.
    """
    current_time = time.time()
    
    # Fetch current global weights
    try:
        global_data = requests.get(
            f"http://{AGGREGATOR_HOST}:{AGGREGATOR_PORT}/get_global",
            timeout=5
        ).json()
        current_round = global_data.get("round", 0)
        global_weights = global_data.get("weights", state.global_weights)
    except:
        current_round = state.current_round
        global_weights = state.global_weights
    
    # Build synthetic delta
    delta_weights = make_synthetic_delta(global_weights, client_id, current_time)
    
    # Prepare payload
    payload = {
        "client_id": client_id,
        "round": current_round,
        "weights": delta_weights,
        "meta": {
            "samples": len(state.detection_history),
            "local_steps": 1,
            "timestamp": current_time,
            "reason": reason
        }
    }
    
    # Send to aggregator
    response = requests.post(
        f"http://{AGGREGATOR_HOST}:{AGGREGATOR_PORT}/send_update",
        json=payload,
        timeout=10
    )
    
    result = response.json()
    
    # Update state
    state.last_update_time = current_time
    state.update_count += 1
    
    # Broadcast to WebSocket clients
    await broadcast_to_websockets({
        "type": "update_sent",
        "data": {
            "client_id": client_id,
            "round": current_round,
            "reason": reason,
            "timestamp": current_time,
            "aggregator_response": result
        }
    })
    
    print(f"✅ Update sent to aggregator (round {current_round}, reason: {reason})")
    
    # Schedule global weight sync
    asyncio.create_task(delayed_sync())
    
    return result

async def delayed_sync():
    """Wait a bit then sync global weights"""
    await asyncio.sleep(3)
    try:
        await sync_global_weights()
    except:
        pass

@app.get("/metrics")
async def get_metrics():
    """
    Return system metrics using psutil.
    """
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        net_io = psutil.net_io_counters()
        
        return {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_mb": memory.used / (1024 * 1024),
            "net_sent_bytes": net_io.bytes_sent,
            "net_recv_bytes": net_io.bytes_recv,
            "timestamp": time.time()
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/status")
async def get_status():
    """
    Return client status and statistics.
    """
    # Check aggregator connectivity
    aggregator_online = False
    try:
        response = requests.get(
            f"http://{AGGREGATOR_HOST}:{AGGREGATOR_PORT}/status",
            timeout=2
        )
        aggregator_online = response.status_code == 200
    except:
        pass
    
    # Calculate time until next update allowed
    time_until_next = max(0, MIN_UPDATE_INTERVAL - (time.time() - state.last_update_time))
    
    return {
        "client_id": CLIENT_ID,
        "current_round": state.current_round,
        "model_loaded": state.model_loaded,
        "total_detections": state.total_detections,
        "update_count": state.update_count,
        "last_update_ago": time.time() - state.last_update_time if state.last_update_time > 0 else None,
        "time_until_next_update": time_until_next,
        "can_update": time_until_next == 0,
        "aggregator_online": aggregator_online,
        "websocket_clients": len(state.websocket_clients),
        "config": {
            "conf_threshold": CONF_THR,
            "high_conf": HIGH_CONF,
            "min_update_interval": MIN_UPDATE_INTERVAL,
            "hysteresis_window": HYSTERESIS_WINDOW,
            "required_frames": REQUIRED_FRAMES
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "client_id": CLIENT_ID}

# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket connection for real-time updates to UI.
    Sends: detection events, update_sent, global_update
    """
    await websocket.accept()
    state.websocket_clients.append(websocket)
    
    print(f"WebSocket client connected. Total: {len(state.websocket_clients)}")
    
    # Send initial state
    await websocket.send_json({
        "type": "connected",
        "data": {
            "client_id": CLIENT_ID,
            "round": state.current_round,
            "weights": state.global_weights
        }
    })
    
    try:
        while True:
            # Keep connection alive and receive any messages from client
            data = await websocket.receive_text()
            
            # Handle client messages if needed
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except:
                pass
                
    except WebSocketDisconnect:
        state.websocket_clients.remove(websocket)
        print(f"WebSocket client disconnected. Remaining: {len(state.websocket_clients)}")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║          FEDERATED LEARNING CLIENT BACKEND                     ║
╚════════════════════════════════════════════════════════════════╝

Client ID:         {CLIENT_ID}
Port:              {CLIENT_PORT}
Aggregator:        http://{AGGREGATOR_HOST}:{AGGREGATOR_PORT}

Configuration:
- Confidence threshold:    {CONF_THR}
- High confidence:         {HIGH_CONF}
- Min update interval:     {MIN_UPDATE_INTERVAL}s
- Hysteresis window:       {HYSTERESIS_WINDOW}s
- Required frames:         {REQUIRED_FRAMES}

Starting server...
    """)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=CLIENT_PORT,
        log_level="info"
    )
