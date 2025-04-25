
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

const Settings = () => {
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="invoices">Invoicing</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Update your business information used in documents and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input id="business-name" defaultValue="Your Business Name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-email">Email</Label>
                  <Input id="business-email" type="email" defaultValue="contact@yourbusiness.com" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="business-phone">Phone</Label>
                  <Input id="business-phone" defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tax-id">Tax ID / VAT Number</Label>
                  <Input id="tax-id" defaultValue="123456789" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="business-address">Address</Label>
                <Textarea 
                  id="business-address" 
                  defaultValue="123 Business Street, City, State, ZIP Code"
                  className="resize-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveGeneral}>Save Changes</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Currency & Date Format</CardTitle>
              <CardDescription>
                Configure your preferred currency and date display formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" defaultValue="USD" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Input id="date-format" defaultValue="MM/DD/YYYY" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveGeneral}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications via email
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
                  <Label htmlFor="daily-summary">Daily Summary</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive a daily summary of your financial activities
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
                  <Label htmlFor="client-activity">Client Activity</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified about client transactions and updates
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
                  <Label htmlFor="overdue-invoices">Overdue Invoices</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified when invoices become overdue
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
              <Button onClick={handleSaveNotifications}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Configuration</CardTitle>
              <CardDescription>
                Configure your invoicing settings and defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
                  <Input id="invoice-prefix" defaultValue="INV-" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="next-invoice-number">Next Invoice Number</Label>
                  <Input id="next-invoice-number" defaultValue="0001" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="default-due-days">Default Payment Terms (days)</Label>
                <Input id="default-due-days" type="number" defaultValue="30" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="default-tax-rate">Default Tax Rate (%)</Label>
                  <Input id="default-tax-rate" type="number" step="0.01" defaultValue="7.5" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="default-tax-name">Default Tax Name</Label>
                  <Input id="default-tax-name" defaultValue="Sales Tax" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="invoice-notes">Default Invoice Notes</Label>
                <Textarea 
                  id="invoice-notes" 
                  defaultValue="Thank you for your business!"
                  className="resize-none"
                />
              </div>
              
              <div className="grid gap-2 pt-4">
                <Label className="mb-2">InvoiceHome Integration</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-muted">Not Connected</Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveInvoices}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About FinTrackPro</CardTitle>
              <CardDescription>
                Information about your accounting system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Version</h3>
                <p className="text-sm text-muted-foreground">FinTrackPro v1.0.0 (MVP)</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Technical Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  This is the MVP version of the custom accounting system.
                  For detailed documentation and user manuals, please visit the help section.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm">User Manual</Button>
                  <Button variant="outline" size="sm">API Docs</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Support</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Need help? Contact our support team.
                </p>
                <Button variant="secondary" size="sm">Contact Support</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
