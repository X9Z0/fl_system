interface LogEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  data?: any;
}

interface EventLogProps {
  events: LogEvent[];
}

export default function EventLog({ events }: EventLogProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "detection":
        return "🔥";
      case "update":
        return "📤";
      case "global":
        return "🌐";
      case "connection":
        return "🔌";
      case "error":
        return "❌";
      default:
        return "📝";
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "detection":
        return "border-orange-500 bg-orange-500/10";
      case "update":
        return "border-blue-500 bg-blue-500/10";
      case "global":
        return "border-purple-500 bg-purple-500/10";
      case "connection":
        return "border-green-500 bg-green-500/10";
      case "error":
        return "border-red-500 bg-red-500/10";
      default:
        return "border-gray-500 bg-gray-500/10";
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">📜 Event Log</h2>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            No events yet
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`border-l-4 ${getEventColor(event.type)} p-2 rounded-r`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">
                  {getEventIcon(event.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {event.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTime(event.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
