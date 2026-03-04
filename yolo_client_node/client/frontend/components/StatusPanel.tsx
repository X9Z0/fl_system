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

interface StatusPanelProps {
  status: ClientStatus | null;
}

export default function StatusPanel({ status }: StatusPanelProps) {
  if (!status) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-3">📊 Status</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const getUpdateStatus = () => {
    if (status.can_update) {
      return { text: "Ready", color: "bg-green-500" };
    } else if (status.time_until_next_update > 0) {
      return {
        text: `Wait ${formatTime(status.time_until_next_update)}`,
        color: "bg-yellow-500",
      };
    }
    return { text: "Idle", color: "bg-gray-500" };
  };

  const updateStatus = getUpdateStatus();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">📊 Client Status</h2>

      <div className="space-y-3">
        {/* Update Status Badge */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Update Status</span>
            <span
              className={`px-2 py-1 rounded text-xs font-bold ${updateStatus.color}`}
            >
              {updateStatus.text}
            </span>
          </div>
        </div>

        {/* Model Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Model Loaded</span>
          <span
            className={`font-mono ${status.model_loaded ? "text-green-400" : "text-red-400"}`}
          >
            {status.model_loaded ? "✓ Yes" : "✗ No"}
          </span>
        </div>

        {/* Round */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Current Round</span>
          <span className="font-mono font-bold text-blue-400">
            {status.current_round}
          </span>
        </div>

        {/* Statistics */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-400">Detections</div>
              <div className="text-2xl font-bold text-orange-400">
                {status.total_detections}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Updates Sent</div>
              <div className="text-2xl font-bold text-green-400">
                {status.update_count}
              </div>
            </div>
          </div>
        </div>

        {/* Last Update */}
        {status.last_update_ago !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last Update</span>
            <span className="font-mono">
              {formatTime(status.last_update_ago)} ago
            </span>
          </div>
        )}

        {/* Configuration */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="text-xs text-gray-400 mb-2">Configuration</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Conf Threshold</span>
              <span className="font-mono">{status.config.conf_threshold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">High Conf</span>
              <span className="font-mono">{status.config.high_conf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Update Interval</span>
              <span className="font-mono">
                {status.config.min_update_interval}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
