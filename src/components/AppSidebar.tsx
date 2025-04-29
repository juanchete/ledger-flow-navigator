import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/Icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "./AuthProvider";
import { useSidebar } from "@/components/ui/sidebar";

const sidebarItems = [
  {
    href: "/",
    icon: "home",
    label: "Dashboard",
  },
  {
    href: "/clients",
    icon: "users",
    label: "Clients",
  },
  {
    href: "/operations",
    icon: "file",
    label: "Operations",
  },
  {
    href: "/calendar",
    icon: "calendar",
    label: "Calendar",
  },
  {
    href: "/statistics",
    icon: "pieChart",
    label: "Statistics",
  },
  {
    href: "/settings",
    icon: "settings",
    label: "Settings",
  },
  {
    href: "/historical-balance",
    icon: "clock",
    label: "Historical Balance",
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isOpen, setIsOpen } = useSidebar();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "bg-background border-r h-screen fixed top-0 left-0 w-64 flex flex-col z-50",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static"
      )}
    >
      <div className="flex items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <Icons.logo className="h-6 w-6" />
          <span>Acme Co.</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="lg:hidden">
          <Icons.close className="h-6 w-6" />
        </Button>
      </div>

      <nav className="flex-1 px-2 py-4">
        <ul>
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-md hover:bg-secondary",
                    isActive ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  <Icons.home className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-8 w-full items-center justify-between rounded-md">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} alt={user?.name || "Avatar"} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium leading-none">{user?.email}</span>
              </div>
              <Icons.chevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Link to="/settings" className="w-full block">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
