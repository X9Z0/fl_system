"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import DetectionOverlay from "@/components/DetectionOverlay";
import StatusPanel from "@/components/StatusPanel";
import GlobalInfo from "@/components/GlobalInfo";
import EventLog from "@/components/EventLog";
import ControlPanel from "@/components/ControlPanel";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const INFERENCE_FPS = 1; // Send frames for inference at 1 FPS

interface Detection {
  label: string;
  conf: number;
  bbox: number[];
}

interface InferResponse {
  timestamp: number;
  detections: Detection[];
  frame_w: number;
  frame_h: number;
  inference_time_ms?: number;
}

interface ClientStatus {
  client_id: string;
  current_round: number;
  model_loaded: boolean;
  total_detections: number;
  update_count: number;
  last_update_ago: number | null;
  time_until_next_update: number;
  can_update: boolean;
  aggregator_online: boolean;
  config: {
    conf_threshold: number;
    high_conf: number;
    min_update_interval: number;
  };
}

interface GlobalWeights {
  round: number;
  weights: Record<string, number[]>;
  timestamp?: number;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

interface LogEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  data?: any;
}

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [videoConstraints, setVideoConstraints] = useState({
    width: 1280,
    height: 720,
    facingMode: "user",
  });
  const [isInferring, setIsInferring] = useState(false);
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
  const [globalWeights, setGlobalWeights] = useState<GlobalWeights | null>(
    null,
  );
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [autoInfer, setAutoInfer] = useState(false);

  const inferenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add event to log
  const addEvent = useCallback((type: string, message: string, data?: any) => {
    const event: LogEvent = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type,
      message,
      data,
    };
    setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
  }, []);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const websocket = new WebSocket(`ws://localhost:5000/ws`);

      websocket.onopen = () => {
        console.log("WebSocket connected");
        setWs(websocket);
        addEvent("connection", "WebSocket connected to backend");
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              addEvent("connection", `Connected as ${message.data.client_id}`);
              break;

            case "detection":
              if (
                message.data.detections &&
                message.data.detections.length > 0
              ) {
                addEvent(
                  "detection",
                  `Detected: ${message.data.detections
                    .map(
                      (d: Detection) =>
                        `${d.label} (${(d.conf * 100).toFixed(1)}%)`,
                    )
                    .join(", ")}`,
                );
              }
              break;

            case "update_sent":
              addEvent(
                "update",
                `Update sent to aggregator (Round ${message.data.round})`,
                message.data,
              );
              break;

            case "global_update":
              setGlobalWeights(message.data);
              addEvent(
                "global",
                `Global weights updated (Round ${message.data.round})`,
              );
              break;
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        addEvent("error", "WebSocket error occurred");
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected");
        setWs(null);
        addEvent("connection", "WebSocket disconnected");

        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      return websocket;
    };

    const websocket = connectWebSocket();

    return () => {
      websocket.close();
    };
  }, [addEvent]);

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/health`);
        setBackendOnline(response.ok);
      } catch {
        setBackendOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch client status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/status`);
        const data = await response.json();
        setClientStatus(data);
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch global weights periodically
  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/global`);
        const data = await response.json();
        if (!data.error) {
          setGlobalWeights(data);
        }
      } catch (err) {
        console.error("Failed to fetch global weights:", err);
      }
    };

    fetchGlobal();
    const interval = setInterval(fetchGlobal, 5000);
    return () => clearInterval(interval);
  }, []);

  // Capture and send frame for inference
  const captureAndInfer = useCallback(async () => {
    if (!webcamRef.current || isInferring) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsInferring(true);

    try {
      // Convert base64 to blob
      const blob = await fetch(imageSrc).then((r) => r.blob());

      // Create form data
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/infer`, {
        method: "POST",
        body: formData,
      });

      const data: InferResponse = await response.json();

      // Update detections
      setDetections(data.detections || []);
    } catch (err) {
      console.error("Inference error:", err);
      addEvent("error", "Failed to run inference");
    } finally {
      setIsInferring(false);
    }
  }, [isInferring, addEvent]);

  // Auto-inference loop
  useEffect(() => {
    if (autoInfer) {
      inferenceIntervalRef.current = setInterval(() => {
        captureAndInfer();
      }, 1000 / INFERENCE_FPS);
    } else {
      if (inferenceIntervalRef.current) {
        clearInterval(inferenceIntervalRef.current);
        inferenceIntervalRef.current = null;
      }
    }

    return () => {
      if (inferenceIntervalRef.current) {
        clearInterval(inferenceIntervalRef.current);
      }
    };
  }, [autoInfer, captureAndInfer]);

  // Manual trigger update
  const triggerManualUpdate = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/trigger_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual" }),
      });
      const data = await response.json();
      addEvent("update", "Manual update triggered", data);
    } catch (err) {
      addEvent("error", "Failed to trigger update");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                🔥 Federated Learning - Fire Detection Client
              </h1>
              <p className="text-gray-400 mt-1">
                Client ID: {clientStatus?.client_id || "Loading..."}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${backendOnline ? "bg-green-500" : "bg-red-500"}`}
                />
                <span className="text-sm">
                  Backend {backendOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    clientStatus?.aggregator_online
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-sm">
                  Aggregator{" "}
                  {clientStatus?.aggregator_online ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Video and Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Webcam Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full rounded-lg"
                />

                {/* Detection Overlay */}
                <DetectionOverlay
                  detections={detections}
                  videoWidth={videoConstraints.width}
                  videoHeight={videoConstraints.height}
                />
              </div>

              {/* Detection Info */}
              {detections.length > 0 && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
                  <h3 className="font-bold text-red-400 mb-2">
                    🔥 Fire Detected!
                  </h3>
                  <div className="space-y-1 text-sm">
                    {detections.map((det, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{det.label}</span>
                        <span className="font-mono">
                          {(det.conf * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Control Panel */}
            <ControlPanel
              autoInfer={autoInfer}
              onToggleAutoInfer={() => setAutoInfer(!autoInfer)}
              onManualInfer={captureAndInfer}
              onTriggerUpdate={triggerManualUpdate}
              isInferring={isInferring}
            />
          </div>

          {/* Right Column - Status and Logs */}
          <div className="space-y-4">
            {/* Status Panel */}
            <StatusPanel status={clientStatus} />

            {/* Global Info */}
            <GlobalInfo weights={globalWeights} />

            {/* Event Log */}
            <EventLog events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
