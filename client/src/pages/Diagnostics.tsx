import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardNav } from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  Zap,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CliCommand {
  id: number;
  command: string;
  output: string | null;
  status: "pending" | "success" | "failed" | "timeout";
  createdAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

export default function Diagnostics() {
  const [deviceId, setDeviceId] = useState("");
  const [command, setCommand] = useState("ping 8.8.8.8");
  const [isAsync, setIsAsync] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState("ping");

  // Fetch devices for selection
  const { data: devicesData } = trpc.devices.list.useQuery({
    page: 1,
    limit: 100,
  });

  // Fetch command history
  const { data: historyData, refetch: refetchHistory } = trpc.cli.list.useQuery({
    page: 1,
    limit: 20,
  });

  // Execute CLI command
  const executeMutation = trpc.cli.create.useMutation({
    onSuccess: () => {
      toast.success("Command executed successfully");
      setCommand("");
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message || "Command execution failed");
    },
  });

  const handleExecute = async () => {
    if (!deviceId) {
      toast.error("Please select a device");
      return;
    }

    if (!command.trim()) {
      toast.error("Please enter a command");
      return;
    }

    await executeMutation.mutateAsync({
      deviceId,
      command,
    });
  };

  const handlePresetCommand = (cmd: string) => {
    setCommand(cmd);
  };

  const handleCopyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
    toast.success("Output copied to clipboard");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
      case "timeout":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Diagnostics</h1>
            <p className="text-muted-foreground mt-1">
              Execute CLI commands on your network devices for troubleshooting
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Command Execution Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Execute Command
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Device Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="device">Select Device</Label>
                    <Select value={deviceId} onValueChange={setDeviceId}>
                      <SelectTrigger id="device">
                        <SelectValue placeholder="Choose a device..." />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device: any) => (
                          <SelectItem key={device.id} value={String(device.deviceId)}>
                            {device.hostname || device.ipAddress || `Device ${device.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preset Commands */}
                  <div className="space-y-2">
                    <Label>Preset Commands</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetCommand("ping 8.8.8.8")}
                      >
                        Ping Google DNS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetCommand("show version")}
                      >
                        Show Version
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetCommand("show interfaces")}
                      >
                        Show Interfaces
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetCommand("show ip route")}
                      >
                        Show Routes
                      </Button>
                    </div>
                  </div>

                  {/* Command Input */}
                  <div className="space-y-2">
                    <Label htmlFor="command">Command</Label>
                    <Textarea
                      id="command"
                      placeholder="Enter CLI command (e.g., ping 192.168.1.1)"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      disabled={executeMutation.isPending}
                      className="font-mono text-sm"
                      rows={4}
                    />
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAsync}
                        onChange={(e) => setIsAsync(e.target.checked)}
                        disabled={executeMutation.isPending}
                        className="rounded"
                      />
                      <span className="text-sm">Async execution</span>
                    </label>
                  </div>

                  {/* Execute Button */}
                  <Button
                    onClick={handleExecute}
                    disabled={executeMutation.isPending || !deviceId || !command.trim()}
                    className="w-full gap-2"
                  >
                    {executeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Execute Command
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Common Commands
                  </p>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-xs">
                    <li>• <code>ping &lt;ip&gt;</code> - Test connectivity</li>
                    <li>• <code>show version</code> - Device info</li>
                    <li>• <code>show interfaces</code> - Interface status</li>
                    <li>• <code>show ip route</code> - Routing table</li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    Async Mode
                  </p>
                  <p className="text-amber-800 dark:text-amber-200 text-xs">
                    Enable for long-running commands. Results will be available in the history.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Command History */}
          {historyData && historyData?.commands?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Command History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {historyData?.commands?.map((cmd: CliCommand) => (
                    <div
                      key={cmd.id}
                      className="border border-border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(cmd.status)}
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                            {cmd.command}
                          </code>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(cmd.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {cmd.output && (
                        <div className="bg-muted rounded p-2 space-y-2">
                          <pre className="text-xs overflow-x-auto max-h-40 overflow-y-auto">
                            {cmd.output}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyOutput(cmd.output || "")}
                            className="gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </Button>
                        </div>
                      )}

                      {cmd.errorMessage && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 flex gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700 dark:text-red-300">
                            {cmd.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
