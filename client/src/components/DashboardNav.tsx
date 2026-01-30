import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LogOut,
  Menu,
  Network,
  Settings,
  TrendingUp,
  Users,
  Zap,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <BarChart3 className="w-5 h-5" /> },
  { label: "Devices", path: "/devices", icon: <Network className="w-5 h-5" /> },
  { label: "Clients", path: "/clients", icon: <Users className="w-5 h-5" /> },
  { label: "Diagnostics", path: "/diagnostics", icon: <Zap className="w-5 h-5" /> },
  { label: "Alerts", path: "/alerts", icon: <AlertTriangle className="w-5 h-5" /> },
  { label: "Availability", path: "/availability", icon: <TrendingUp className="w-5 h-5" /> },
];

export function DashboardNav() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6 text-primary" />
          <span className="font-semibold text-sm">ExtremeCloud IQ</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-accent rounded-md"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-30 border-r border-border overflow-y-auto">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                  location === item.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:bg-background lg:border-r lg:border-border lg:flex lg:flex-col">
        {/* Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <Network className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="font-bold text-sm">ExtremeCloud IQ</h1>
            <p className="text-xs text-muted-foreground">Monitor</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                  location === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 h-10">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>
                <span className="text-xs">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Offset */}
      <div className="lg:ml-64 pt-16 lg:pt-0" />
    </>
  );
}
