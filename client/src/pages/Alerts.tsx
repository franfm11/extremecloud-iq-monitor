import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: number;
  alertId: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category?: string;
  title: string;
  description?: string;
  timestamp: Date;
  acknowledged: number;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

const SEVERITY_LEVELS = [
  { value: "critical", label: "Critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" },
  { value: "high", label: "High", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950" },
  { value: "medium", label: "Medium", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950" },
  { value: "low", label: "Low", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950" },
  { value: "info", label: "Info", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-950" },
];

export default function Alerts() {
  const [page, setPage] = useState(1);
  const [selectedSeverity, setSelectedSeverity] = useState<string | undefined>();
  const [limit] = useState(20);

  // Fetch alerts from API
  const { data: apiData, isLoading: isApiLoading, refetch: refetchApi } = trpc.alerts.list.useQuery({
    page,
    limit,
    severity: selectedSeverity as any,
  });

  // Fallback to cached alerts
  const { data: cachedData, isLoading: isCacheLoading } = trpc.alerts.list.useQuery({
    page,
    limit,
    severity: selectedSeverity as any,
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = trpc.alerts.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Alert acknowledged");
      refetchApi();
    },
    onError: () => {
      toast.error("Failed to acknowledge alert");
    },
  });

  const isLoading = isApiLoading || isCacheLoading;
  const alerts = apiData?.data || cachedData || [];

  const handleRefresh = async () => {
    try {
      await refetchApi();
      toast.success("Alerts refreshed");
    } catch (error) {
      toast.error("Failed to refresh alerts");
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    await acknowledgeMutation.mutateAsync({ alertId });
  };

  const getSeverityConfig = (severity: string) => {
    return SEVERITY_LEVELS.find((s) => s.value === severity) || SEVERITY_LEVELS[4];
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="w-5 h-5" />;
      case "medium":
      case "low":
        return <AlertCircle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
              <p className="text-muted-foreground mt-1">
                Monitor security and operational alerts from your network
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filter by Severity</label>
                  <Select value={selectedSeverity || ""} onValueChange={(v) => {
                    setSelectedSeverity(v || undefined);
                    setPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Severities</SelectItem>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">
                    No alerts found. Your network is operating normally.
                  </p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert: Alert) => {
                const severityConfig = getSeverityConfig(alert.severity);
                return (
                  <Card key={alert.id} className={`border-l-4 ${severityConfig.bg}`}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className={severityConfig.color}>
                              {getSeverityIcon(alert.severity)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{alert.title}</h3>
                                <span className={`text-xs font-medium px-2 py-1 rounded ${severityConfig.color} bg-opacity-20`}>
                                  {severityConfig.label}
                                </span>
                              </div>
                              {alert.description && (
                                <p className="text-sm text-muted-foreground">
                                  {alert.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{formatTime(alert.timestamp)}</span>
                                {alert.category && <span>{alert.category}</span>}
                                {alert.acknowledged ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    Acknowledged by {alert.acknowledgedBy}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            {acknowledgeMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Acknowledge"
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {apiData && apiData.total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(apiData.total / limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(apiData.total / limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
