import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityIndicatorProps {
  uptimePercentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
}

export function AvailabilityIndicator({
  uptimePercentage,
  size = "md",
  showLabel = true,
  showIcon = true,
}: AvailabilityIndicatorProps) {
  // Determine status based on uptime percentage
  const getStatus = (uptime: number) => {
    if (uptime >= 99.9) return "excellent";
    if (uptime >= 99) return "very-good";
    if (uptime >= 95) return "good";
    if (uptime >= 90) return "fair";
    return "poor";
  };

  const status = getStatus(uptimePercentage);

  const statusConfig = {
    excellent: {
      bg: "bg-green-100 dark:bg-green-950",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-300 dark:border-green-800",
      icon: CheckCircle2,
      label: "Excellent",
    },
    "very-good": {
      bg: "bg-emerald-100 dark:bg-emerald-950",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-300 dark:border-emerald-800",
      icon: CheckCircle2,
      label: "Very Good",
    },
    good: {
      bg: "bg-blue-100 dark:bg-blue-950",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-300 dark:border-blue-800",
      icon: TrendingUp,
      label: "Good",
    },
    fair: {
      bg: "bg-yellow-100 dark:bg-yellow-950",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-300 dark:border-yellow-800",
      icon: AlertCircle,
      label: "Fair",
    },
    poor: {
      bg: "bg-red-100 dark:bg-red-950",
      text: "text-red-700 dark:text-red-300",
      border: "border-red-300 dark:border-red-800",
      icon: AlertCircle,
      label: "Poor",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border",
        sizeClasses[size],
        config.bg,
        config.border,
        config.text
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{uptimePercentage.toFixed(2)}%</span>
        {showLabel && <span className="text-xs opacity-75">{config.label}</span>}
      </div>
    </div>
  );
}
