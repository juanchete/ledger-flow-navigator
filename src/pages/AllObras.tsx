import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllObras } from "@/integrations/supabase/obraService";
import { getBankAccounts, BankAccountApp } from "@/integrations/supabase/bankAccountService";
import { createTransaction, filterTransactions, Transaction } from "@/integrations/supabase/transactionService";
import { Obra } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Receipt, Plus, RefreshCw, Calendar, DollarSign, FileText } from "lucide-react";
import { Icons } from "@/components/Icons";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { exchangeRateService } from "@/services/exchangeRateService";
import { format } from "date-fns";
import { es } from "date-fns/locale";
const AllExpenses: React.FC = () => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados para gastos simples
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(false);

  // Estados para el modal de gastos simples - Basado en TransactionForm
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountApp[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isUSD, setIsUSD] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [customRate, setCustomRate] = useState<string>("");
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    notes: "",
    paymentMethod: "cash"
  });

  // Cargar tasa de cambio al inicializar el componente
  useEffect(() => {
    const loadExchangeRate = async () => {
      setIsLoadingRate(true);
      try {
        const response = await exchangeRateService.getExchangeRates();
        if (response.success && response.data) {
          // Usar tasa paralelo por defecto
          const parallelRate = response.data.usd_to_ves_parallel;
          setExchangeRate(parallelRate);
          setCustomRate(parallelRate.toString());
          setLastUpdated(response.data.last_updated);
        } else {
          // Fallback a una tasa más actualizada que la anterior
          setExchangeRate(36.5);
          setCustomRate("36.5");
          setLastUpdated("Sin datos recientes");
        }
      } catch (error) {
        console.error("Error al cargar tasa de cambio:", error);
        setExchangeRate(36.5);
        setCustomRate("36.5");
        setLastUpdated("Error al cargar");
      } finally {
        setIsLoadingRate(false);
      }
    };
    loadExchangeRate();
  }, []);

  // Función para refrescar la tasa de cambio
  const refreshExchangeRate = async () => {
    setIsRefreshing(true);
    try {
      const response = await exchangeRateService.forceRefresh();
      if (response.success && response.data) {
        const parallelRate = response.data.usd_to_ves_parallel;
        if (!useCustomRate) {
          setExchangeRate(parallelRate);
        }
        setCustomRate(parallelRate.toString());
        setLastUpdated(response.data.last_updated);
        toast.success(`Tasa actualizada: Bs. ${parallelRate.toFixed(2)}`);
      } else {
        throw new Error("No se pudo actualizar la tasa");
      }
    } catch (error) {
      console.error("Error al refrescar tasa:", error);
      toast.error("No se pudo actualizar la tasa de cambio");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Actualizar tasa cuando el usuario cambia el valor personalizado
  const handleCustomRateChange = (value: string) => {
    setCustomRate(value);
    if (useCustomRate) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue) && numericValue > 0) {
        setExchangeRate(numericValue);
      }
    }
  };

  // Manejar el cambio del checkbox de tasa personalizada
  const handleUseCustomRateChange = (checked: boolean) => {
    setUseCustomRate(checked);
    if (checked) {
      // Si activa la tasa personalizada, usar el valor del input
      const numericValue = parseFloat(customRate);
      if (!isNaN(numericValue) && numericValue > 0) {
        setExchangeRate(numericValue);
      }
    } else {
      // Si desactiva la tasa personalizada, recargar la tasa automática
      const reloadAutomaticRate = async () => {
        try {
          const response = await exchangeRateService.getExchangeRates();
          if (response.success && response.data) {
            const parallelRate = response.data.usd_to_ves_parallel;
            setExchangeRate(parallelRate);
            setCustomRate(parallelRate.toString());
            setLastUpdated(response.data.last_updated);
          }
        } catch (error) {
          console.error("Error al recargar tasa automática:", error);
        }
      };
      reloadAutomaticRate();
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [obrasData, accountsData] = await Promise.all([getAllObras(), getBankAccounts()]);
        setObras(obrasData);
        setBankAccounts(accountsData);
        // Cargar gastos simples también
        await loadExpenses();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get unique banks for the bank selection dropdown
  const availableBanks = Array.from(new Set(bankAccounts.map(account => account.bankName)));
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    const parsedAmount = parseFloat(newExpense.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Por favor ingrese un monto válido mayor que cero");
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      // Crear la transacción de gasto
      await createTransaction({
        id: uuidv4(),
        type: "expense",
        amount: parsedAmount,
        description: newExpense.description,
        date: new Date(now),
        status: "completed",
        category: newExpense.category || undefined,
        notes: newExpense.notes || undefined,
        paymentMethod: newExpense.paymentMethod,
        bankAccountId: selectedAccount || undefined,
        createdAt: new Date(now)
      });
      toast.success("Gasto registrado exitosamente");

      // Recargar la lista de gastos
      await loadExpenses();

      // Resetear el formulario
      setNewExpense({
        description: "",
        amount: "",
        category: "",
        notes: "",
        paymentMethod: "cash"
      });
      setSelectedBank("");
      setSelectedAccount("");
      setIsExpenseModalOpen(false);
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Error al registrar el gasto");
    } finally {
      setIsSaving(false);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge variant="secondary">Planificación</Badge>;
      case 'in-progress':
        return <Badge variant="default">En Progreso</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-700">Completada</Badge>;
      case 'on-hold':
        return <Badge variant="destructive">En Espera</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Función para cargar gastos simples
  const loadExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const expenseTransactions = await filterTransactions({
        type: "expense",
        status: "completed"
      });
      setExpenses(expenseTransactions);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Error al cargar los gastos");
    } finally {
      setLoadingExpenses(false);
    }
  };
  if (loading) {
    return <div className="flex justify-center items-center h-screen">
        <Progress value={50} />
      </div>;
  }
  return <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Gastos</h1>
          <p className="text-muted-foreground">
            Administra tus gastos simples y proyectos de inversión
          </p>
        </div>
      </div>

      <Tabs defaultValue="simple" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Gastos Simples
          </TabsTrigger>
          <TabsTrigger value="investment" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Proyectos de Inversión
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Gastos Simples</h2>
              <p className="text-sm text-muted-foreground">
                Gastos que se descuentan directamente de tus cuentas
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsExpenseModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo Gasto
            </Button>
          </div>
          
          <Card className="shadow-sm">
            <CardContent className="px-4 sm:px-0">
              {loadingExpenses ? <div className="flex items-center justify-center p-8 sm:p-12">
                  <div className="text-muted-foreground text-sm sm:text-base">Cargando gastos...</div>
                </div> : <div className="space-y-4">
                  {/* Vista de tabla para pantallas medianas y grandes */}
                  <div className="hidden md:block rounded-md border">
                    <div className="grid grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
                      <div className="col-span-4">Descripción</div>
                      <div className="col-span-2">Fecha</div>
                      <div className="col-span-2">Monto</div>
                      <div className="col-span-2">Categoría</div>
                      <div className="col-span-2">Método de Pago</div>
                    </div>
                    
                    <div className="divide-y">
                      {expenses.length > 0 ? expenses.map(expense => <div key={expense.id} className="grid grid-cols-12 p-4 items-center hover:bg-muted/25 transition-colors">
                          <div className="col-span-4">
                            <div className="font-medium">{expense.description}</div>
                            {expense.notes && <div className="text-sm text-muted-foreground line-clamp-1">{expense.notes}</div>}
                          </div>
                          
                          <div className="col-span-2 text-sm">
                            {format(new Date(expense.date), "dd/MM/yyyy", {
                        locale: es
                      })}
                          </div>
                          
                          <div className="col-span-2 font-medium">
                            ${expense.amount.toLocaleString()}
                          </div>
                          
                          <div className="col-span-2">
                            {expense.category ? <Badge variant="secondary">{expense.category}</Badge> : <span className="text-muted-foreground text-sm">Sin categoría</span>}
                          </div>
                          
                          <div className="col-span-2 text-sm">
                            {expense.payment_method || 'No especificado'}
                          </div>
                        </div>) : <div className="p-8 text-center text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No hay gastos registrados</p>
                          <p className="text-sm">Haz clic en "Nuevo Gasto" para comenzar</p>
                        </div>}
                    </div>
                  </div>

                  {/* Vista de tarjetas para pantallas pequeñas */}
                  <div className="md:hidden space-y-3">
                    {expenses.length > 0 ? expenses.map(expense => <div key={expense.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="border-red-500 text-red-700">
                            Gasto
                          </Badge>
                          <span className="font-medium text-lg">
                            ${expense.amount.toLocaleString()}
                          </span>
                        </div>
                        
                        <div>
                          <div className="font-medium text-sm mb-1">{expense.description}</div>
                          {expense.notes && <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {expense.notes}
                            </div>}
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {format(new Date(expense.date), "dd/MM/yyyy", {
                        locale: es
                      })}
                          </span>
                          <div className="flex gap-2">
                            {expense.category && <Badge variant="secondary" className="text-xs">{expense.category}</Badge>}
                            {expense.payment_method && <span className="text-muted-foreground text-xs">
                                {expense.payment_method}
                              </span>}
                          </div>
                        </div>
                      </div>) : <div className="p-8 text-center text-muted-foreground border rounded-lg">
                        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay gastos registrados</p>
                        <p className="text-sm">Haz clic en "Nuevo Gasto" para comenzar</p>
                      </div>}
                  </div>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investment" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Proyectos de Inversión</h2>
              <p className="text-sm text-muted-foreground">
                Obras y proyectos que incrementan tu patrimonio
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/obras/new">
                <Plus className="h-4 w-4" />
                Nuevo Proyecto
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obras.map(obra => <Card key={obra.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{obra.name}</CardTitle>
                    {getStatusBadge(obra.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {obra.description || "Sin descripción"}
                  </p>
                  
                  {obra.location && <p className="text-sm">
                      <strong>Ubicación:</strong> {obra.location}
                    </p>}
                  
                  {obra.budget && <p className="text-sm">
                      <strong>Presupuesto:</strong> ${obra.budget.toLocaleString()}
                    </p>}
                  
                  <Button asChild className="w-full mt-4">
                    <Link to={`/obras/${obra.id}`}>Ver Detalles</Link>
                  </Button>
                </CardContent>
              </Card>)}
          </div>

          {obras.length === 0 && <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay proyectos de inversión registrados</p>
                  <p className="text-sm">Crea tu primer proyecto para comenzar</p>
                </div>
              </CardContent>
            </Card>}
        </TabsContent>
      </Tabs>

      {/* Modal para Gastos Simples - Basado en TransactionForm */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrar Nuevo Gasto
            </DialogTitle>
            <DialogDescription>
              Registra un gasto que se descontará directamente de tu cuenta seleccionada.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateExpense} className="space-y-6">
            <div className="grid gap-4 py-4">
              {/* Sección de Monto */}
              <div className="grid gap-4 p-4 border rounded-lg bg-muted/10">
                <Label className="text-sm font-medium">Monto del Gasto</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="radio" id="currency-usd" name="currency" checked={isUSD} onChange={() => setIsUSD(true)} className="rounded" />
                      <Label htmlFor="currency-usd" className="text-sm">
                        USD (Dólares)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" id="currency-ves" name="currency" checked={!isUSD} onChange={() => setIsUSD(false)} className="rounded" />
                      <Label htmlFor="currency-ves" className="text-sm">
                        VES (Bolívares)
                      </Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Monto *</Label>
                    <Input type="number" step="0.01" min="0" value={newExpense.amount} onChange={e => setNewExpense({
                    ...newExpense,
                    amount: e.target.value
                  })} placeholder={isUSD ? "0.00 USD" : "0.00 VES"} required />
                    {isUSD && exchangeRate > 0 && <div className="text-xs text-muted-foreground">
                        ≈ Bs. {(parseFloat(newExpense.amount || "0") * exchangeRate).toFixed(2)}
                      </div>}
                  </div>
                </div>
              </div>

              {/* Sección de Tasa de Cambio */}
              <div className="grid gap-4 p-4 border rounded-lg bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Tasa de Cambio (USD/VES)</Label>
                  <div className="flex items-center gap-2">
                    {isLoadingRate && <span className="text-xs text-muted-foreground">Cargando...</span>}
                    <Button type="button" variant="ghost" size="sm" onClick={refreshExchangeRate} disabled={isLoadingRate || isRefreshing} className="h-8 w-8 p-0">
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="useCustomRate" checked={useCustomRate} onChange={e => handleUseCustomRateChange(e.target.checked)} className="rounded" />
                      <Label htmlFor="useCustomRate" className="text-sm">
                        Usar tasa personalizada
                      </Label>
                    </div>
                    
                    <Input type="number" step="0.01" min="0" value={customRate} onChange={e => handleCustomRateChange(e.target.value)} disabled={!useCustomRate} placeholder="Ingresa tasa personalizada" className={!useCustomRate ? "bg-muted" : ""} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {useCustomRate ? "Tasa actual:" : "Tasa paralelo actual:"}
                    </Label>
                    <div className="text-lg font-medium">
                      {isLoadingRate ? "..." : `Bs. ${exchangeRate.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {useCustomRate ? "Personalizada" : "Obtenida automáticamente"}
                    </div>
                    {lastUpdated && !useCustomRate && <div className="text-xs text-muted-foreground">
                        Actualizada: {new Date(lastUpdated).toLocaleString('es-VE', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                      </div>}
                  </div>
                </div>
              </div>

              {/* Sección de Cuenta Bancaria */}
              <div className="grid gap-4 p-4 border rounded-lg bg-muted/10">
                <Label className="text-sm font-medium">Cuenta Bancaria (Opcional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Banco</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar banco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin banco específico</SelectItem>
                        {availableBanks.map(bank => <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Cuenta</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={!selectedBank || selectedBank === "none"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cuenta específica</SelectItem>
                        {bankAccounts.filter(account => selectedBank === "none" || account.bankName === selectedBank).map(account => <SelectItem key={account.id} value={account.id}>
                              {account.accountNumber} ({account.currency})
                            </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Campos adicionales */}
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Descripción *
                  </Label>
                  <Input id="description" type="text" value={newExpense.description} onChange={e => setNewExpense({
                  ...newExpense,
                  description: e.target.value
                })} placeholder="Descripción del gasto" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-sm font-medium">
                      Categoría
                    </Label>
                    <Input id="category" type="text" value={newExpense.category} onChange={e => setNewExpense({
                    ...newExpense,
                    category: e.target.value
                  })} placeholder="Categoría" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethod" className="text-sm font-medium">
                      Método de Pago
                    </Label>
                    <Select value={newExpense.paymentMethod} onValueChange={value => setNewExpense({
                    ...newExpense,
                    paymentMethod: value
                  })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notas
                  </Label>
                  <Textarea id="notes" value={newExpense.notes} onChange={e => setNewExpense({
                  ...newExpense,
                  notes: e.target.value
                })} placeholder="Notas adicionales sobre el gasto" rows={3} />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Registrando..." : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};
export default AllExpenses;