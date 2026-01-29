import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { DeviceStatusBadge } from "@/components/DeviceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  Network,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Check if user has valid token
  const { data: tokenStatus } = trpc.extremecloud.hasValidToken.useQuery();

  // Fetch dashboard data
  const { data: devicesData } = trpc.devices.getCached.useQuery({
    page: 1,
    limit: 5,
  });

  const { data: alertsData } = trpc.alerts.getCached.useQuery({
    page: 1,
    limit: 5,
  });

  const { data: clientsData } = trpc.clients.getCached.useQuery({
    page: 1,
    limit: 5,
  });

  const devices = devicesData || [];
  const alerts = alertsData || [];
  const clients = clientsData || [];

  const onlineDevices = devices.filter((d: any) => d.connected).length;
  const offlineDevices = devices.filter((d: any) => !d.connected).length;
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical").length;
  const connectedClients = clients.filter((c: any) => c.connected).length;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-2">
              {!tokenStatus?.hasToken
                ? "Please log in to ExtremeCloud IQ to view your network data."
                : tokenStatus?.isExpired
                ? "Your session has expired. Please log in again."
                : "Here's your network status overview."}
            </p>
          </div>

          {/* Login Prompt */}
          {!tokenStatus?.hasToken && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      Connect to ExtremeCloud IQ
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Enter your ExtremeCloud IQ credentials to start monitoring your network devices.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/login")}
                    className="gap-2 whitespace-nowrap"
                  >
                    <Network className="w-4 h-4" />
                    Connect Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          {tokenStatus?.hasToken && !tokenStatus?.isExpired && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Devices */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                    <Network className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{devices.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {onlineDevices} online
                      </span>
                      {" · "}
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {offlineDevices} offline
                      </span>
                    </p>
                  </CardContent>
                </Card>

                {/* Clients */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Connected Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{connectedClients}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {clients.length}
                    </p>
                  </CardContent>
                </Card>

                {/* Alerts */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{criticalAlerts}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {alerts.length}
                    </p>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    <Activity className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Operational</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All systems running
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Devices */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Recent Devices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {devices.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No devices available</p>
                  ) : (
                    <div className="space-y-3">
                      {devices.slice(0, 5).map((device: any) => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{device.hostname || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.ipAddress} · {device.productType}
                            </p>
                          </div>
                          <DeviceStatusBadge
                            status={device.connected ? "online" : "offline"}
                            lastConnectTime={device.lastConnectTime}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate("/devices")}
                  >
                    View All Devices
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Recent Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No alerts</p>
                  ) : (
                    <div className="space-y-3">
                      {alerts.slice(0, 5).map((alert: any) => (
                        <div
                          key={alert.id}
                          className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{alert.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.category} · {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              alert.severity === "critical"
                                ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                                : alert.severity === "high"
                                ? "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                                : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate("/alerts")}
                  >
                    View All Alerts
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
