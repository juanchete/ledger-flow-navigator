import React, { useState, useEffect } from 'react';
import { useTransactionWizard } from '@/contexts/TransactionWizardContext';
import { TRANSACTION_TYPE_CONFIGS } from '@/types/wizard';
import { getBankAccounts, BankAccountApp } from '@/integrations/supabase/bankAccountService';
import { getClients, Client } from '@/integrations/supabase/clientService';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Edit, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  CreditCard,
  FileText,
  User,
  Building2,
  ArrowRight
} from 'lucide-react';

export const ConfirmationStep: React.FC = () => {
  const { data, goToStep, isLoading, errors } = useTransactionWizard();
  const [bankAccounts, setBankAccounts] = useState<BankAccountApp[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar datos necesarios para mostrar nombres
  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsData, clientsData] = await Promise.all([
          getBankAccounts(),
          getClients()
        ]);
        setBankAccounts(accountsData);
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  if (!data.transactionType) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Primero debes seleccionar un tipo de transacción</p>
      </div>
    );
  }

  const config = TRANSACTION_TYPE_CONFIGS[data.transactionType];
  const isBalanceChange = data.transactionType === 'balance-change';

  // Obtener nombres de entidades relacionadas
  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente no encontrado';
  };

  const getBankAccountName = (accountId?: string) => {
    if (!accountId) return null;
    const account = bankAccounts.find(a => a.id.toString() === accountId);
    return account?.bank || 'Cuenta no encontrada';
  };

  const getPaymentMethodLabel = (method?: string) => {
    const methods: Record<string, string> = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'credit_card': 'Tarjeta de Crédito',
      'other': 'Otro'
    };
    return method ? methods[method] || method : 'No especificado';
  };

  // Función para editar un paso específico
  const editStep = (stepIndex: number) => {
    goToStep(stepIndex);
  };

  if (loadingData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Errores si los hay */}
      {Object.keys(errors).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Hay algunos campos que necesitan ser completados:
            <ul className="list-disc ml-4 mt-2">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Resumen principal de la transacción */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{config.icon}</div>
                <div>
                  <CardTitle className="text-xl">{config.label}</CardTitle>
                  <CardDescription>{data.description || config.description}</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editStep(0)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Cambiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Monto</p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.currency} {parseFloat(data.amount || '0').toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-medium">
                      {data.date ? new Date(data.date).toLocaleDateString('es-ES') : 'Hoy'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles de la operación */}
        {(data.operationType || data.category) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Detalles de la Operación</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editStep(1)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.category && (
                  <div>
                    <p className="text-sm text-gray-600">Categoría</p>
                    <p className="font-medium">{data.category}</p>
                  </div>
                )}
                {data.clientId && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      <p className="font-medium">{getClientName(data.clientId)}</p>
                    </div>
                  </div>
                )}
                {data.relatedType && (
                  <div>
                    <p className="text-sm text-gray-600">Tipo de relación</p>
                    <Badge variant="secondary">
                      {data.relatedType === 'debt' ? 'Deuda' : 'Cuenta por cobrar'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Método de pago / Transferencia */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {isBalanceChange ? 'Transferencia entre Cuentas' : 'Método de Pago'}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editStep(isBalanceChange ? 2 : 3)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isBalanceChange ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Cuenta Origen</p>
                    <p className="font-medium">{getBankAccountName(data.bankAccountId)}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Cuenta Destino</p>
                    <p className="font-medium">{getBankAccountName(data.destinationBankAccountId)}</p>
                  </div>
                </div>
                {data.bankCommission && parseFloat(data.bankCommission) > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Comisión Bancaria</p>
                    <p className="font-medium">{data.bankCommission}%</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Método</p>
                    <p className="font-medium">{getPaymentMethodLabel(data.paymentMethod)}</p>
                  </div>
                </div>
                {data.bankAccountId && ['transfer', 'credit_card'].includes(data.paymentMethod || '') && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Cuenta Bancaria</p>
                      <p className="font-medium">{getBankAccountName(data.bankAccountId)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Denominaciones (si aplica) */}
        {data.denominations && data.denominations.some(d => d.value > 0 && d.count > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Denominaciones</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editStep(2)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.denominations
                  .filter(d => d.value > 0 && d.count > 0)
                  .map((denomination, index) => (
                    <div key={denomination.id} className="flex justify-between items-center">
                      <span>{data.currency} {denomination.value} x {denomination.count}</span>
                      <span className="font-medium">
                        {data.currency} {(denomination.value * denomination.count).toFixed(2)}
                      </span>
                    </div>
                  ))}
                <Separator />
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>
                    {data.currency} {data.denominations
                      .reduce((sum, d) => sum + (d.value * d.count), 0)
                      .toFixed(2)
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información adicional */}
        {(data.reference || data.notes || data.receipt) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Información Adicional</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editStep(isBalanceChange ? 3 : 4)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.reference && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Referencia</p>
                      <p className="font-medium">{data.reference}</p>
                    </div>
                  </div>
                )}
                {data.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notas</p>
                    <p className="font-medium">{data.notes}</p>
                  </div>
                )}
                {data.receipt && (
                  <div>
                    <p className="text-sm text-gray-600">Comprobante</p>
                    <p className="font-medium">{data.receipt.name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones finales */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <p className="text-lg font-semibold text-green-900">
                  ¿Todo se ve correcto?
                </p>
              </div>
              <p className="text-green-700">
                Una vez que confirmes, la transacción será registrada en el sistema y se actualizarán los balances correspondientes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 