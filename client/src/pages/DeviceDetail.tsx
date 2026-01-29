import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { DeviceStatusBadge } from "@/components/DeviceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, Zap } from "lucide-react";

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // Fetch device details
  const { data: device, isLoading, error, refetch } = trpc.devices.detail.useQuery(
    { deviceId: id || "" },
    { enabled: !!id }
  );

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Invalid Device ID</h3>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      The device ID is missing or invalid.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/devices")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Device Details</h1>
              <p className="text-muted-foreground mt-1">ID: {id}</p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Failed to Load Device</h3>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      {error.message || "Unable to fetch device details. Please try again."}
                    </p>
                    <Button
                      onClick={() => refetch()}
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Information */}
          {device && !isLoading && (
            <>
              {/* Status Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Status</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DeviceStatusBadge
                    status={device.connected ? "online" : device.last_connect_time ? "offline" : "unknown"}
                    lastConnectTime={device.last_connect_time}
                  />
                  {device.last_connect_time && (
                    <div className="text-sm text-muted-foreground">
                      Last connected: {new Date(device.last_connect_time).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Hostname */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Hostname</p>
                      <p className="text-base font-semibold">{device.hostname || "N/A"}</p>
                    </div>

                    {/* IP Address */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                      <p className="text-base font-mono">{device.ip_address || "N/A"}</p>
                    </div>

                    {/* MAC Address */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">MAC Address</p>
                      <p className="text-base font-mono">{device.mac_address || "N/A"}</p>
                    </div>

                    {/* Serial Number */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                      <p className="text-base font-mono">{device.serial_number || "N/A"}</p>
                    </div>

                    {/* Product Type */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Product Type</p>
                      <p className="text-base">{device.product_type || "N/A"}</p>
                    </div>

                    {/* Software Version */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Software Version</p>
                      <p className="text-base">{device.software_version || "N/A"}</p>
                    </div>

                    {/* Device Function */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Device Function</p>
                      <p className="text-base">{device.device_function || "N/A"}</p>
                    </div>

                    {/* Managed Status */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Managed Status</p>
                      <p className="text-base">{device.device_admin_state || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => navigate(`/diagnostics?device=${id}`)}
                    className="w-full gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Run Diagnostics on This Device
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
