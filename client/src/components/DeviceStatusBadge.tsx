import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

export type DeviceStatus = "online" | "offline" | "unknown";

interface DeviceStatusBadgeProps {
  status: DeviceStatus;
  lastConnectTime?: string | null;
  className?: string;
}

/**
 * Traffic light status indicator for device connectivity
 * GREEN (online): connected = true
 * RED (offline): connected = false with last_connect_time
 * GRAY (unknown): API or network error
 */
export function DeviceStatusBadge({
  status,
  lastConnectTime,
  className = "",
}: DeviceStatusBadgeProps) {
  const statusConfig = {
    online: {
      label: "Online",
      icon: <CheckCircle2 className="w-4 h-4" />,
      bgColor: "bg-green-50 dark:bg-green-950",
      textColor: "text-green-700 dark:text-green-300",
      dotColor: "bg-green-500",
    },
    offline: {
      label: "Offline",
      icon: <AlertCircle className="w-4 h-4" />,
      bgColor: "bg-red-50 dark:bg-red-950",
      textColor: "text-red-700 dark:text-red-300",
      dotColor: "bg-red-500",
    },
    unknown: {
      label: "Unknown",
      icon: <HelpCircle className="w-4 h-4" />,
      bgColor: "bg-gray-50 dark:bg-gray-900",
      textColor: "text-gray-700 dark:text-gray-300",
      dotColor: "bg-gray-500",
    },
  };

  const config = statusConfig[status];

  const formatLastConnect = (time: string | null | undefined) => {
    if (!time) return null;
    try {
      const date = new Date(time);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return time;
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${config.bgColor} ${config.textColor} ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
      <div className="flex items-center gap-1">
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      {status === "offline" && lastConnectTime && (
        <span className="text-xs opacity-75 ml-auto">
          {formatLastConnect(lastConnectTime)}
        </span>
      )}
    </div>
  );
}
