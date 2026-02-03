import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { DeviceStatusBadge, type DeviceStatus } from "@/components/DeviceStatusBadge";
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
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface Device {
  id: number;
  deviceId?: string;
  hostname?: string;
  mac_address?: string;
  ip_address?: string;
  serial_number?: string;
  product_type?: string;
  software_version?: string;
  connected: boolean;
  last_connect_time?: string;
}

export default function Devices() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit] = useState(20);

  // Fetch devices from API
  const { data: apiData, isLoading: isApiLoading, refetch: refetchApi } = trpc.devices.list.useQuery({
    page,
    limit,
  });

  // Fallback to cached devices if API fails
  const { data: cachedData, isLoading: isCacheLoading } = trpc.devices.list.useQuery({
    page,
    limit,
  });

  const isLoading = isApiLoading || isCacheLoading;
  const devices = apiData?.data || cachedData || [];

  const filteredDevices = devices.filter((device: Device) =>
    device.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.ip_address?.includes(searchTerm) ||
    device.mac_address?.includes(searchTerm)
  );

  const getDeviceStatus = (device: Device): DeviceStatus => {
    if (device.connected) return "online";
    if (device.last_connect_time) return "offline";
    return "unknown";
  };

  const handleRefresh = async () => {
    try {
      await refetchApi();
      toast.success("Devices refreshed");
    } catch (error) {
      toast.error("Failed to refresh devices");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
              <p className="text-muted-foreground mt-1">
                Manage and monitor your network devices
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

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hostname, IP address, or MAC address..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Devices Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filteredDevices.length} Device{filteredDevices.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {devices.length === 0
                      ? "No devices found. Please login to ExtremeCloud IQ first."
                      : "No devices match your search."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Hostname</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>MAC Address</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Product Type</TableHead>
                        <TableHead>Software Version</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.map((device: Device) => (
                        <TableRow key={device.id} className="hover:bg-accent/50">
                          <TableCell>
                            <DeviceStatusBadge
                              status={getDeviceStatus(device)}
                              lastConnectTime={device.last_connect_time}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {device.hostname || "N/A"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {device.ip_address || "N/A"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {device.mac_address || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {device.serial_number || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {device.product_type || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {device.software_version || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              // Navigate to device detail using deviceId
                              window.location.href = `/device/${device.deviceId || device.id}`;
                            }}
                          >
                            View
                            <ChevronRight className="w-4 h-4" />
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
