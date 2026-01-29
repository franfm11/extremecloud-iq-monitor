import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { AvailabilityIndicator } from "@/components/AvailabilityIndicator";
import { PeriodSelector, Period } from "@/components/PeriodSelector";
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
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  TrendingDown,
  Clock,
  RefreshCw,
} from "lucide-react";

export default function Availability() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("24h");

  // Fetch availability reports
  const { data: reports, isLoading, error, refetch } = trpc.availability.getReports.useQuery(
    { deviceId: id || "", periods: ["5m", "1h", "24h", "7d", "30d"] },
    { enabled: !!id }
  );

  // Fetch recent outages
  const { data: outages } = trpc.availability.getRecentOutages.useQuery(
    { deviceId: id || "", limit: 10 },
    { enabled: !!id }
  );

  const currentReport = useMemo(() => {
    return reports?.[selectedPeriod];
  }, [reports, selectedPeriod]);

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="lg:ml-64 p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/device/${id}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Availability Report</h1>
              <p className="text-muted-foreground mt-1">Device ID: {id}</p>
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
                    <h3 className="font-semibold text-red-900 dark:text-red-100">
                      Failed to Load Availability Report
                    </h3>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      {error.message || "Unable to fetch availability data. Please try again."}
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

          {/* Period Selector */}
          {reports && !isLoading && (
            <>
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

              {/* Current Report Overview */}
              {currentReport && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Availability Metrics</CardTitle>
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
                  <CardContent className="space-y-6">
                    {/* Main Indicator */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Overall Uptime</p>
                        <AvailabilityIndicator
                          uptimePercentage={currentReport.uptimePercentage}
                          size="lg"
                          showLabel
                        />
                      </div>
                      <div className="text-right space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Status</p>
                          <p className="text-lg font-semibold capitalize">
                            {currentReport.currentStatus === "up" ? (
                              <span className="text-green-600 dark:text-green-400">Online</span>
                            ) : currentReport.currentStatus === "down" ? (
                              <span className="text-red-600 dark:text-red-400">Offline</span>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400">Unknown</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Uptime */}
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm text-muted-foreground mb-1">Total Uptime</p>
                        <p className="text-2xl font-bold">
                          {Math.floor(currentReport.uptime / 3600)}h{" "}
                          {Math.floor((currentReport.uptime % 3600) / 60)}m
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {currentReport.uptime} seconds
                        </p>
                      </div>

                      {/* Downtime */}
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm text-muted-foreground mb-1">Total Downtime</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {Math.floor(currentReport.downtime / 3600)}h{" "}
                          {Math.floor((currentReport.downtime % 3600) / 60)}m
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {currentReport.downtime} seconds
                        </p>
                      </div>

                      {/* API Errors */}
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm text-muted-foreground mb-1">API Errors</p>
                        <p className="text-2xl font-bold">{currentReport.apiErrors}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: API errors don't indicate device downtime
                        </p>
                      </div>
                    </div>

                    {/* Last State Change */}
                    {currentReport.lastStateChange && (
                      <div className="rounded-lg border border-border p-4 bg-accent/50">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Last State Change</p>
                            <p className="font-medium">
                              {new Date(currentReport.lastStateChange).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Outages */}
              {currentReport && currentReport.outages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5" />
                      Outages in This Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentReport.outages.map((outage, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {new Date(outage.startTime).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Duration: {Math.floor(outage.duration / 3600)}h{" "}
                                {Math.floor((outage.duration % 3600) / 60)}m{" "}
                                {Math.floor(outage.duration % 60)}s
                              </p>
                              {outage.reason && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Reason: {outage.reason}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                              Offline
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Outages */}
              {outages && outages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Outages (All Time)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Start Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outages.map((outage, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm">
                                {new Date(outage.startTime).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {Math.floor(outage.duration / 3600)}h{" "}
                                {Math.floor((outage.duration % 3600) / 60)}m
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {outage.reason || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Reports Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Uptime Summary - All Periods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-5">
                    {reports &&
                      Object.entries(reports).map(([period, report]) => (
                        <div
                          key={period}
                          className="rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedPeriod(period as Period)}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                            {period === "5m"
                              ? "Last 5 min"
                              : period === "1h"
                              ? "Last 1h"
                              : period === "24h"
                              ? "Last 24h"
                              : period === "7d"
                              ? "Last 7d"
                              : "Last 30d"}
                          </p>
                          <p className="text-2xl font-bold">
                            {report.uptimePercentage.toFixed(2)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {report.outages.length} outage{report.outages.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
