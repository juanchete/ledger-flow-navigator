
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "./AuthProvider";

function AppLayoutContent() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <SidebarInset>
        {/* Mobile sidebar trigger */}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 lg:hidden">
          <SidebarTrigger className="-ml-1" />
        </header>
        
        <main className="flex-1 p-6 overflow-auto lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
          <Toaster position="top-right" />
        </main>
      </SidebarInset>
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
