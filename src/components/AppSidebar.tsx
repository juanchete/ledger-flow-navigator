import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "./AuthProvider";

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
    href: "/obras",
    icon: "receipt",
    label: "Gastos",
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
    href: "/invoices",
    icon: "invoice",
    label: "Facturas",
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
  const { logout } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();

  const handleLinkClick = () => {
    // Cerrar el sidebar en móvil cuando se hace clic en un enlace
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <Link to="/" className="flex items-center gap-2 font-bold" onClick={handleLinkClick}>
            <Icons.logo className="h-6 w-6" />
            <span>Track & Go</span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            const IconComponent = Icons[item.icon as keyof typeof Icons];
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.href} onClick={handleLinkClick}>
                    <IconComponent className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => logout && logout()}
              >
                <Icons.close className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
