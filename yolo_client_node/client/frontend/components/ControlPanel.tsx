interface ControlPanelProps {
  autoInfer: boolean;
  onToggleAutoInfer: () => void;
  onManualInfer: () => void;
  onTriggerUpdate: () => void;
  isInferring: boolean;
}

export default function ControlPanel({
  autoInfer,
  onToggleAutoInfer,
  onManualInfer,
  onTriggerUpdate,
  isInferring,
}: ControlPanelProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">🎮 Controls</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Auto Inference Toggle */}
        <button
          onClick={onToggleAutoInfer}
          className={`px-4 py-3 rounded-lg font-semibold transition-all ${
            autoInfer
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {autoInfer ? "⏸️ Stop Auto Detect" : "▶️ Start Auto Detect"}
        </button>

        {/* Manual Inference */}
        <button
          onClick={onManualInfer}
          disabled={isInferring || autoInfer}
          className="px-4 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
        >
          {isInferring ? "⏳ Detecting..." : "📸 Detect Once"}
        </button>

        {/* Manual Update Trigger */}
        <button
          onClick={onTriggerUpdate}
          className="px-4 py-3 rounded-lg font-semibold bg-orange-600 hover:bg-orange-700 transition-all"
        >
          📤 Force Update
        </button>

        {/* Simulate Detection */}
        <button
          onClick={onManualInfer}
          disabled={isInferring}
          className="px-4 py-3 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
        >
          🔥 Test Detection
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-sm">
        <div className="space-y-1 text-gray-300">
          <p>
            <span className="font-semibold">Auto Detect:</span> Continuously
            captures and analyzes frames
          </p>
          <p>
            <span className="font-semibold">Detect Once:</span> Capture and
            analyze single frame
          </p>
          <p>
            <span className="font-semibold">Force Update:</span> Manually send
            update to aggregator
          </p>
        </div>
      </div>
    </div>
  );
}
