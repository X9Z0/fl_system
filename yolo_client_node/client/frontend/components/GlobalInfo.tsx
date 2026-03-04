interface GlobalWeights {
  round: number;
  weights: Record<string, number[]>;
  timestamp?: number;
}

interface GlobalInfoProps {
  weights: GlobalWeights | null;
}

export default function GlobalInfo({ weights }: GlobalInfoProps) {
  if (!weights) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">🌐 Global Model</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  // Calculate weight norm for visualization
  const calculateWeightNorm = (weights: Record<string, number[]>) => {
    let sumSquares = 0;
    for (const layer in weights) {
      for (const value of weights[layer]) {
        sumSquares += value * value;
      }
    }
    return Math.sqrt(sumSquares);
  };

  const weightNorm = calculateWeightNorm(weights.weights);

  // Create a simple hash for visualization
  const hashWeights = (weights: Record<string, number[]>) => {
    const str = JSON.stringify(weights);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  };

  const weightHash = hashWeights(weights.weights);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">🌐 Global Model</h2>

      <div className="space-y-3">
        {/* Round */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Round</span>
          <span className="font-mono font-bold text-2xl text-purple-400">
            {weights.round}
          </span>
        </div>

        {/* Weight Norm */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Weight Norm</span>
          <span className="font-mono text-sm">{weightNorm.toFixed(4)}</span>
        </div>

        {/* Weight Hash */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Weight Hash</span>
          <span className="font-mono text-xs bg-gray-700 px-2 py-1 rounded">
            {weightHash}
          </span>
        </div>

        {/* Last Updated */}
        {weights.timestamp && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last Updated</span>
            <span className="font-mono text-xs">
              {formatTimestamp(weights.timestamp)}
            </span>
          </div>
        )}

        {/* Weight Layers */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="text-xs text-gray-400 mb-2">Layers</div>
          <div className="space-y-2">
            {Object.entries(weights.weights).map(([layer, values]) => (
              <div key={layer} className="bg-gray-700/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold">{layer}</span>
                  <span className="text-xs text-gray-400">
                    dim: {values.length}
                  </span>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {values.slice(0, 10).map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-8 h-8 bg-blue-500/20 border border-blue-500/50 rounded flex items-center justify-center"
                      title={val.toFixed(4)}
                    >
                      <div
                        className="w-1 bg-blue-400 rounded"
                        style={{
                          height: `${Math.min(100, Math.abs(val) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                  {values.length > 10 && (
                    <div className="flex items-center text-xs text-gray-500">
                      +{values.length - 10}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
