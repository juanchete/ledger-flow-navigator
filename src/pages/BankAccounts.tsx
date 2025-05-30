import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, DollarSign, Coins, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getBankAccounts, 
  createBankAccount, 
  updateBankAccount, 
  deleteBankAccount,
  recalculateAccountBalance,
  recalculateAllAccountBalances,
  type BankAccount,
  type BankAccountInsert,
  type BankAccountUpdate
} from "@/integrations/supabase/bankAccountService";
import { v4 as uuidv4 } from 'uuid';

interface BankAccountFormData {
  bank: string;
  account_number: string;
  amount: number;
  currency: string;
}

const initialFormData: BankAccountFormData = {
  bank: '',
  account_number: '',
  amount: 0,
  currency: 'USD'
};

const BankAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getBankAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas bancarias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async () => {
    if (!formData.bank || !formData.account_number) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newAccount: BankAccountInsert = {
        id: uuidv4(),
        bank: formData.bank,
        account_number: formData.account_number,
        amount: formData.amount,
        currency: formData.currency
      };

      await createBankAccount(newAccount);
      await fetchAccounts();
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
      toast({
        title: "Éxito",
        description: "Cuenta bancaria creada exitosamente",
      });
    } catch (error) {
      console.error('Error al crear cuenta:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta bancaria",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !formData.bank || !formData.account_number) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: BankAccountUpdate = {
        bank: formData.bank,
        account_number: formData.account_number,
        amount: formData.amount,
        currency: formData.currency
      };

      await updateBankAccount(editingAccount.id, updates);
      await fetchAccounts();
      setIsEditModalOpen(false);
      setEditingAccount(null);
      setFormData(initialFormData);
      toast({
        title: "Éxito",
        description: "Cuenta bancaria actualizada exitosamente",
      });
    } catch (error) {
      console.error('Error al actualizar cuenta:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la cuenta bancaria",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteBankAccount(accountId);
      await fetchAccounts();
      toast({
        title: "Éxito",
        description: "Cuenta bancaria eliminada exitosamente",
      });
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta bancaria",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank: account.bank,
      account_number: account.account_number,
      amount: account.amount,
      currency: account.currency
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingAccount(null);
  };

  const handleRecalculateBalance = async (accountId: string) => {
    setIsRecalculating(true);
    try {
      const newBalance = await recalculateAccountBalance(accountId);
      await fetchAccounts(); // Refrescar la lista
      toast({
        title: "Éxito",
        description: `Saldo recalculado: ${formatCurrency(newBalance)}`,
      });
    } catch (error) {
      console.error('Error al recalcular saldo:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular el saldo de la cuenta",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleRecalculateAllBalances = async () => {
    setIsRecalculating(true);
    try {
      const results = await recalculateAllAccountBalances();
      await fetchAccounts(); // Refrescar la lista
      toast({
        title: "Éxito",
        description: `Saldos recalculados para ${results.length} cuentas`,
      });
    } catch (error) {
      console.error('Error al recalcular saldos:', error);
      toast({
        title: "Error",
        description: "No se pudieron recalcular los saldos",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Calcular totales
  const usdAccounts = accounts.filter(acc => acc.currency === 'USD');
  const vesAccounts = accounts.filter(acc => acc.currency === 'VES');
  const totalUSD = usdAccounts.reduce((sum, acc) => sum + acc.amount, 0);
  const totalVES = vesAccounts.reduce((sum, acc) => sum + acc.amount, 0);

  const formatCurrencyByType = (amount: number, currency: string) => {
    return currency === 'USD' 
      ? formatCurrency(amount)
      : `Bs. ${new Intl.NumberFormat('es-VE').format(amount)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-fade-in">
        <div className="text-center py-8">Cargando cuentas bancarias...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Cuentas Bancarias</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleRecalculateAllBalances}
            disabled={isRecalculating}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRecalculating ? 'Recalculando...' : 'Recalcular Saldos'}</span>
            <span className="sm:hidden">{isRecalculating ? 'Recalculando...' : 'Recalcular'}</span>
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nueva Cuenta</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-2 sm:mx-4">
            <DialogHeader className="pb-3 sm:pb-4">
              <DialogTitle className="text-base sm:text-lg lg:text-xl">Crear Nueva Cuenta Bancaria</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Ingresa los detalles de la nueva cuenta bancaria.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
              <div className="grid gap-2">
                <Label htmlFor="bank" className="text-sm font-medium">Banco *</Label>
                <Input
                  id="bank"
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  placeholder="Ej: Banco de Venezuela"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_number" className="text-sm font-medium">Número de Cuenta *</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Ej: 0102-1234-5678-9012"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-sm font-medium">Saldo Inicial</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="text-sm sm:text-base"
                />
                <p className="text-xs text-muted-foreground">Monto inicial disponible en la cuenta</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency" className="text-sm font-medium">Moneda</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD" className="text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <span>💵</span>
                        <span>USD - Dólares Americanos</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="VES" className="text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <span>🇻🇪</span>
                        <span>VES - Bolívares Venezolanos</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)} 
                className="w-full sm:w-auto order-2 sm:order-1"
                size="sm"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateAccount} 
                disabled={isSubmitting || !formData.bank || !formData.account_number} 
                className="w-full sm:w-auto order-1 sm:order-2"
                size="sm"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Crear Cuenta</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Total en USD
            </CardTitle>
            <CardDescription className="text-xl sm:text-2xl font-bold">
              {formatCurrency(totalUSD)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {usdAccounts.length} cuenta{usdAccounts.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Coins className="mr-2 h-4 w-4" />
              Total en VES
            </CardTitle>
            <CardDescription className="text-xl sm:text-2xl font-bold">
              Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {vesAccounts.length} cuenta{vesAccounts.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de cuentas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Todas las Cuentas</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cuentas bancarias registradas
            </div>
          ) : (
            <div className="space-y-4">
              {/* Vista de tabla para pantallas medianas y grandes */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Número de Cuenta</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id} className="hover:bg-muted/25 transition-colors">
                        <TableCell className="font-medium">{account.bank}</TableCell>
                        <TableCell>{account.account_number}</TableCell>
                        <TableCell>
                          <Badge variant={account.currency === 'USD' ? 'default' : 'secondary'}>
                            {account.currency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrencyByType(account.amount, account.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/accounts/${account.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditModal(account)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRecalculateBalance(account.id)}
                              disabled={isRecalculating}
                              title="Recalcular saldo basado en transacciones"
                            >
                              <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta bancaria 
                                    "{account.bank} - {account.account_number}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista de tarjetas para pantallas pequeñas */}
              <div className="md:hidden space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{account.bank}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {account.account_number}
                        </div>
                      </div>
                      <Badge variant={account.currency === 'USD' ? 'default' : 'secondary'} className="ml-2">
                        {account.currency}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Saldo:</span>
                      <span className="font-semibold text-lg">
                        {formatCurrencyByType(account.amount, account.currency)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/accounts/${account.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRecalculateBalance(account.id)}
                          disabled={isRecalculating}
                          title="Recalcular saldo"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta bancaria 
                              "{account.bank} - {account.account_number}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAccount(account.id)} className="w-full sm:w-auto">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-2 sm:mx-4">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg lg:text-xl">Editar Cuenta Bancaria</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Modifica los detalles de la cuenta bancaria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-bank" className="text-sm font-medium">Banco *</Label>
              <Input
                id="edit-bank"
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                placeholder="Ej: Banco de Venezuela"
                className="text-sm sm:text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-account_number" className="text-sm font-medium">Número de Cuenta *</Label>
              <Input
                id="edit-account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Ej: 0102-1234-5678-9012"
                className="text-sm sm:text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-amount" className="text-sm font-medium">Saldo</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">Saldo actual de la cuenta</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-currency" className="text-sm font-medium">Moneda</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue placeholder="Selecciona una moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD" className="text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <span>💵</span>
                      <span>USD - Dólares Americanos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="VES" className="text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <span>🇻🇪</span>
                      <span>VES - Bolívares Venezolanos</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)} 
              className="w-full sm:w-auto order-2 sm:order-1"
              size="sm"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditAccount} 
              disabled={isSubmitting || !formData.bank || !formData.account_number} 
              className="w-full sm:w-auto order-1 sm:order-2"
              size="sm"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAccounts; 