import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Banknote, Clock, Bug, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  calculateCashInventory, 
  isCashAccount,
  type CashInventoryResult,
  type DenominationInventory
} from "@/integrations/supabase/denominationInventoryService";
import type { BankAccount } from "@/integrations/supabase/bankAccountService";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { debugTransactions } from "@/utils/debugDatabase";
import { EditCashInventoryModal } from "./EditCashInventoryModal";

interface CashInventoryCardProps {
  bankAccount: BankAccount;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  if (currency === 'VES') {
    return `Bs. ${new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export function CashInventoryCard({ bankAccount }: CashInventoryCardProps) {
  const [inventory, setInventory] = useState<CashInventoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleDebug = async () => {
    console.log('=== STARTING DEBUG ===');
    await debugTransactions(bankAccount.id);
  };

  const handleInventoryUpdated = () => {
    // Recargar el inventario después de una actualización
    fetchInventory();
  };

  const fetchInventory = async () => {
    if (!isCashAccount(bankAccount)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await calculateCashInventory(bankAccount.id, false); // Debug desactivado
      setInventory(result);
    } catch (err) {
      console.error('Error fetching cash inventory:', err);
      setError('Error al cargar el inventario de efectivo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [bankAccount]);

  // No mostrar la tarjeta si no es una cuenta de efectivo
  if (!isCashAccount(bankAccount)) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Inventario de Efectivo
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDebug}>
                <Bug className="h-4 w-4 mr-1" />
                Debug
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowEditModal(true)}
                disabled={loading}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Inventario de Efectivo
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDebug}>
                <Bug className="h-4 w-4 mr-1" />
                Debug
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        
        {/* Modal de edición */}
        <EditCashInventoryModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          bankAccount={bankAccount}
          currentInventory={[]}
          onInventoryUpdated={handleInventoryUpdated}
        />
      </Card>
    );
  }

  if (!inventory || inventory.denominations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Inventario de Efectivo
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDebug}>
                <Bug className="h-4 w-4 mr-1" />
                Debug
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se han registrado denominaciones para esta cuenta de efectivo.
              Las denominaciones se registran automáticamente cuando realizas transacciones en efectivo con {bankAccount.currency}.
              <br /><br />
              <strong>¿Quieres establecer tu inventario actual?</strong> Haz clic en "Editar" para registrar cuánto efectivo tienes disponible por denominación.
            </AlertDescription>
          </Alert>
        </CardContent>
        
        {/* Modal de edición */}
        <EditCashInventoryModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          bankAccount={bankAccount}
          currentInventory={[]}
          onInventoryUpdated={handleInventoryUpdated}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Inventario de Efectivo
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Actualizado: {format(inventory.lastUpdated, "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen total */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Total en efectivo:</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(inventory.totalAmount, inventory.currency)}
              </p>
            </div>
            <Badge variant="outline" className="text-green-700 border-green-300">
              {inventory.currency}
            </Badge>
          </div>
        </div>

        {/* Desglose por denominaciones */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Desglose por denominación:</h4>
          <div className="grid gap-2">
            {inventory.denominations.map((denomination) => (
              <DenominationRow 
                key={denomination.value} 
                denomination={denomination} 
                currency={inventory.currency} 
              />
            ))}
          </div>
        </div>

        {/* Validación con saldo de cuenta */}
        {Math.abs(inventory.totalAmount - bankAccount.amount) > 0.01 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Discrepancia detectada:</strong> El inventario de denominaciones ({formatCurrency(inventory.totalAmount, inventory.currency)}) 
              no coincide con el saldo de la cuenta ({formatCurrency(bankAccount.amount, bankAccount.currency)}).
              Esto puede indicar transacciones sin denominaciones registradas.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      {/* Modal de edición */}
      <EditCashInventoryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        bankAccount={bankAccount}
        currentInventory={inventory?.denominations || []}
        onInventoryUpdated={handleInventoryUpdated}
      />
    </Card>
  );
}

interface DenominationRowProps {
  denomination: DenominationInventory;
  currency: string;
}

function DenominationRow({ denomination, currency }: DenominationRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-2 h-6 bg-green-500 rounded-full"></div>
        <div>
          <p className="font-medium">
            {formatCurrency(denomination.value, currency)}
          </p>
          <p className="text-sm text-muted-foreground">
            {denomination.count} {denomination.count === 1 ? 'billete' : 'billetes'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">
          {formatCurrency(denomination.total, currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          {denomination.value} × {denomination.count}
        </p>
      </div>
    </div>
  );
}