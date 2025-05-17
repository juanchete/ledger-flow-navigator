import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UserProfileManager } from "@/components/UserProfileManager";
import { useAuth } from "@/components/AuthProvider";

const Settings = () => {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    daily: true,
    clientActivity: true,
    overdueInvoices: true
  });
  
  const handleSaveGeneral = () => {
    toast.success("General settings saved successfully!");
  };
  
  const handleSaveNotifications = () => {
    toast.success("Notification settings saved successfully!");
  };
  
  const handleSaveInvoices = () => {
    toast.success("Invoice settings saved successfully!");
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="invoices">Facturación</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="about">Acerca de</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
              <CardDescription>
                Actualiza la información de tu negocio utilizada en documentos y facturas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Nombre del Negocio</Label>
                  <Input id="business-name" defaultValue="Your Business Name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-email">Correo</Label>
                  <Input id="business-email" type="email" defaultValue="contact@yourbusiness.com" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="business-phone">Teléfono</Label>
                  <Input id="business-phone" defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tax-id">RIF / NIT</Label>
                  <Input id="tax-id" defaultValue="123456789" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="business-address">Dirección</Label>
                <Textarea 
                  id="business-address" 
                  defaultValue="123 Business Street, City, State, ZIP Code"
                  className="resize-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveGeneral}>Guardar Cambios</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Moneda y Formato de Fecha</CardTitle>
              <CardDescription>
                Configura tu moneda y formato de fecha preferidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Input id="currency" defaultValue="USD" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date-format">Formato de Fecha</Label>
                  <Input id="date-format" defaultValue="MM/DD/YYYY" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveGeneral}>Guardar Cambios</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificación</CardTitle>
              <CardDescription>
                Configura cómo y cuándo recibes notificaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notificaciones por Correo</Label>
                  <div className="text-sm text-muted-foreground">
                    Recibe notificaciones por correo electrónico
                  </div>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-summary">Resumen Diario</Label>
                  <div className="text-sm text-muted-foreground">
                    Recibe un resumen diario de tus actividades financieras
                  </div>
                </div>
                <Switch
                  id="daily-summary"
                  checked={notifications.daily}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, daily: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="client-activity">Actividad de Clientes</Label>
                  <div className="text-sm text-muted-foreground">
                    Recibe notificaciones sobre transacciones y actualizaciones de clientes
                  </div>
                </div>
                <Switch
                  id="client-activity"
                  checked={notifications.clientActivity}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, clientActivity: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="overdue-invoices">Facturas Vencidas</Label>
                  <div className="text-sm text-muted-foreground">
                    Recibe notificaciones cuando una factura esté vencida
                  </div>
                </div>
                <Switch
                  id="overdue-invoices"
                  checked={notifications.overdueInvoices}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, overdueInvoices: checked })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveNotifications}>Guardar Cambios</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Facturación</CardTitle>
              <CardDescription>
                Configura tus opciones y valores predeterminados de facturación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="invoice-prefix">Prefijo de Factura</Label>
                  <Input id="invoice-prefix" defaultValue="INV-" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="next-invoice-number">Próximo Número de Factura</Label>
                  <Input id="next-invoice-number" defaultValue="0001" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="default-due-days">Términos de Pago Predeterminados (días)</Label>
                <Input id="default-due-days" type="number" defaultValue="30" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="default-tax-rate">Tasa de Impuesto Predeterminada (%)</Label>
                  <Input id="default-tax-rate" type="number" step="0.01" defaultValue="7.5" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="default-tax-name">Nombre de Impuesto Predeterminado</Label>
                  <Input id="default-tax-name" defaultValue="Sales Tax" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="invoice-notes">Notas de Factura Predeterminadas</Label>
                <Textarea 
                  id="invoice-notes" 
                  defaultValue="Thank you for your business!"
                  className="resize-none"
                />
              </div>
              
              <div className="grid gap-2 pt-4">
                <Label className="mb-2">Integración InvoiceHome</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-muted">No Conectado</Badge>
                  <Button variant="outline" size="sm">Conectar</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveInvoices}>Guardar Cambios</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UserProfileManager />
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acerca de FinTrackPro</CardTitle>
              <CardDescription>
                Información sobre tu sistema contable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Versión</h3>
                <p className="text-sm text-muted-foreground">FinTrackPro v1.0.0 (MVP)</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Documentación Técnica</h3>
                <p className="text-sm text-muted-foreground">
                  Esta es la versión MVP del sistema contable personalizado.
                  Para documentación detallada y manuales de usuario, por favor visita la sección de ayuda.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm">Manual de Usuario</Button>
                  <Button variant="outline" size="sm">Docs API</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Soporte</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  ¿Necesitas ayuda? Contacta a nuestro equipo de soporte.
                </p>
                <Button variant="secondary" size="sm">Contactar Soporte</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
