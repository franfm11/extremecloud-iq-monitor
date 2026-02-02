import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.extremecloud.login.useMutation({
    onSuccess: () => {
      toast.success("Successfully logged in to ExtremeCloud IQ");
      navigate("/devices");
    },
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    try {
      // Call the actual XIQ login endpoint
      await loginMutation.mutateAsync({
        username,
        password,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ExtremeCloud IQ</h1>
              <p className="text-sm text-slate-400">Network Monitor</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter any credentials to access the monitoring dashboard (Testing Mode)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-200">
                  Username (any value for testing)
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="test@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Password (any value for testing)
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="password123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              {/* Info Box */}
              <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Testing Mode</p>
                  <p className="text-xs">
                    Enter any username and password to access the dashboard. This is for testing purposes only.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400">
          All credentials are transmitted securely and stored encrypted on the server.
        </p>
      </div>
    </div>
  );
}
