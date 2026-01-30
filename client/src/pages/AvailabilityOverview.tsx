import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { PeriodSelector, Period } from "@/components/PeriodSelector";
import { AvailabilityIndicator } from "@/components/AvailabilityIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle, TrendingUp, Eye } from "lucide-react";
import { useLocation } from "wouter";

export default function AvailabilityOverview() {
  const [, navigate] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("24h");

  // Fetch availability statistics for all devices
  const { data: stats, isLoading, error, refetch } = trpc.availability.getDevicesStats.useQuery(
    { period: selectedPeriod }
  );

  // Fetch all devices to show alongside stats
  const { data: devices } = trpc.devices.list.useQuery(
    { page: 1, limit: 100 }
  );

  // Combine stats with device info
  const deviceStats = devices?.data?.map((device: any) => {
    const stat = stats?.find((s) => s.deviceId === String(device.id));
    return {
      ...device,
      uptimePercentage: stat?.uptimePercentage ?? 0,
      lastStatus: stat?.lastStatus ?? "unknown",
    };
  }) ?? [];

  // Sort by uptime percentage
  const sortedDevices = [...deviceStats].sort(
    (a: any, b: any) => a.uptimePercentage - b.uptimePercentage
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              Availability Overview
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor uptime metrics across all devices
            </p>
          </div>

          {/* Period Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Time Period</CardTitle>
            </CardHeader>
            <CardContent>
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </CardContent>
          </Card>

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
                    <h3 className="font-semibold text-red-900 dark:text-red-100">
                      Failed to Load Availability Data
                    </h3>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      {error.message || "Unable to fetch availability statistics."}
                    </p>
                    <Button
                      onClick={() => refetch()}
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          {stats && !isLoading && (
            <>
                    <div className="grid gap-4 md:grid-cols-3">
                {/* Total Devices */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{deviceStats.length}</p>
                  </CardContent>
                </Card>

                {/* Devices Online */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Devices Online</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {deviceStats.filter((d: any) => d.lastStatus === "up").length}
                    </p>
                  </CardContent>
                </Card>

                {/* Devices Offline */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Devices Offline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {deviceStats.filter((d: any) => d.lastStatus === "down").length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Devices Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Uptime Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {sortedDevices.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No devices found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Device Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Uptime</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedDevices.map((device: any) => (
                            <TableRow key={device.id}>
                              <TableCell className="font-medium">
                                {device.hostname || device.id}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    device.lastStatus === "up"
                                      ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                                      : device.lastStatus === "down"
                                      ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                                      : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                                  }`}
                                  title={device.lastStatus === "unknown" ? "API unavailable or no recent data" : ""}
                                >
                                  {device.lastStatus === "up"
                                    ? "Online"
                                    : device.lastStatus === "down"
                                    ? "Offline"
                                    : "Unknown (API Error)"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <AvailabilityIndicator
                                  uptimePercentage={device.uptimePercentage}
                                  size="sm"
                                  showLabel={false}
                                />
                              </TableCell>
                                  <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/availability/${(device as any).id}`)}
                                  className="gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Report
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Devices with Lowest Uptime */}
              {sortedDevices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Devices with Lowest Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sortedDevices.slice(0, 5).map((device: any) => (
                        <div
                          key={(device as any).id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/availability/${(device as any).id}`)}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{device.hostname || device.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {device.productType || "Unknown type"}
                            </p>
                          </div>
                          <AvailabilityIndicator
                            uptimePercentage={device.uptimePercentage}
                            size="md"
                            showLabel
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
