import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from "@/components/ui/sidebar";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar, File, PieChart, Receipt, Settings, Users, Wallet } from "lucide-react";
export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const menuItems = [{
    title: "Dashboard",
    icon: PieChart,
    path: "/"
  }, {
    title: "Clients",
    icon: Users,
    path: "/clients"
  }, {
    title: "Operations",
    icon: Wallet,
    path: "/operations"
  }, {
    title: "Calendar",
    icon: Calendar,
    path: "/calendar"
  }, {
    title: "Statistics",
    icon: File,
    path: "/statistics"
  }, {
    title: "Invoices",
    icon: Receipt,
    path: "/invoices"
  }];
  return <Sidebar>
      <SidebarHeader className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="bg-finance-blue rounded-md p-1">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && <h1 className="text-lg font-semibold">FinTrackPro</h1>}
        </div>
        
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild className={cn("flex items-center", location.pathname === item.path && "text-sidebar-primary-foreground bg-sidebar-primary")}>
                    <Link to={item.path} className="flex items-center gap-3 w-full">
                      <item.icon size={18} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenuButton asChild className="flex items-center">
          <Link to="/settings" className="flex items-center gap-3 w-full">
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>;
}