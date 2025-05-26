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
    label: "Inicio",
  },
  {
    href: "/all-receivables",
    icon: "file",
    label: "Cuentas por cobrar",
  },
  {
    href: "/all-debts",
    icon: "file",
    label: "Deudas",
  },
  {
    href: "/clients",
    icon: "users",
    label: "Clientes",
  },
  {
    href: "/operations",
    icon: "file",
    label: "Operaciones",
  },
  {
    href: "/accounts",
    icon: "creditCard",
    label: "Cuentas Bancarias",
  },
  {
    href: "/exchange-rates",
    icon: "dollarSign",
    label: "Tasas de Cambio",
  },
  {
    href: "/interest-calculator",
    icon: "calculator",
    label: "Calculadora de Intereses",
  },
  {
    href: "/calendar",
    icon: "calendar",
    label: "Calendario",
  },
  {
    href: "/statistics",
    icon: "pieChart",
    label: "Estadísticas",
  },
  {
    href: "/historical-balance",
    icon: "clock",
    label: "Balance Histórico",
  },
  {
    href: "/settings",
    icon: "settings",
    label: "Configuración",
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { open: isOpen, setOpen: setIsOpen } = useSidebar();
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
          <span>Track & Go</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="lg:hidden">
          <Icons.close className="h-6 w-6" />
        </Button>
      </div>

      <nav className="flex-1 px-2 py-4">
        <ul>
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            const IconComponent = Icons[item.icon as keyof typeof Icons];
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-md hover:bg-secondary",
                    isActive ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary text-muted-foreground w-full justify-start"
            onClick={() => logout && logout()}
          >
            <Icons.close className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
