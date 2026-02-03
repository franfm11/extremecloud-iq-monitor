import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
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
import { AlertCircle, Loader2, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: number;
  hostname?: string;
  mac_address?: string;
  ip_address?: string;
  os_type?: string;
  ssid?: string;
  vlan?: number;
  connected: number;
  connection_type?: string;
  rssi?: number;
  client_health?: number;
}

export default function Clients() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit] = useState(20);

  // Fetch clients from API
  const { data: apiData, isLoading: isApiLoading, refetch: refetchApi } = trpc.clients.list.useQuery({
    page,
    limit,
  });

  // Fallback to cached clients
  const { data: cachedData, isLoading: isCacheLoading } = trpc.clients.list.useQuery({
    page,
    limit,
  });

  const isLoading = isApiLoading || isCacheLoading;
  
  const clients = api?.data || cachedData || [];

  const filteredClients = clients.filter((client: Client) =>
    client.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.ip_address?.includes(searchTerm) ||
    client.mac_address?.includes(searchTerm) ||
    client.ssid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    try {
      await refetchApi();
      toast.success("Clients refreshed");
    } catch (error) {
      toast.error("Failed to refresh clients");
    }
  };

  const getHealthColor = (health?: number) => {
    if (!health) return "text-muted-foreground";
    
    if (health >= 80) return "text-green-600 dark:text-green-400";
    if (health >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />


      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Connected Clients</h1>
              <p className="text-muted-foreground mt-1">
                Monitor wireless and wired clients on your network
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
                  placeholder="Search by hostname, IP, MAC, or SSID..."
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

          {/* Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {filteredClients.length} Client{filteredClients.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {clients.length === 0
                      ? "No clients found. Ensure devices are online and clients are connected."
                      : "No clients match your search."}
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
                        <TableHead>SSID</TableHead>
                        <TableHead>VLAN</TableHead>
                        <TableHead>OS Type</TableHead>
                        <TableHead>Health</TableHead>
                        <TableHead>Signal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client: Client) => (
                        <TableRow key={client.id} className="hover:bg-accent/50">
                          <TableCell>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                client.connected ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {client.hostname || "N/A"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {client.ip_address || "N/A"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {client.mac_address || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {client.ssid || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {client.vlan || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {client.os_type || "N/A"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${getHealthColor(client.client_health)}`}>
                              {client.client_health ? `${client.client_health}%` : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {client.rssi ? `${client.rssi} dBm` : "N/A"}
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
