
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

function AppLayoutContent() {
  const { user, userProfile, isAdmin } = useAuth();
  const { toggleSidebar } = useSidebar();

  return (
    <div className="min-h-screen flex w-full">
      {/* Mobile sidebar trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto lg:p-6 pt-16 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
        <Toaster position="top-right" />
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
}
