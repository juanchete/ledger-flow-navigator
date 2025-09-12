import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { 
  getStandardDenominations, 
  setExactInventory,
  type DenominationInventory 
} from "@/integrations/supabase/denominationInventoryService";
import type { BankAccount } from "@/integrations/supabase/bankAccountService";

interface EditCashInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccount;
  currentInventory: DenominationInventory[];
  onInventoryUpdated: () => void;
}

interface EditableDenomination {
  id: string;
  value: number;
  count: number;
  total: number;
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

export function EditCashInventoryModal({ 
  isOpen, 
  onClose, 
  bankAccount, 
  currentInventory, 
  onInventoryUpdated 
}: EditCashInventoryModalProps) {
  const [denominations, setDenominations] = useState<EditableDenomination[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar denominaciones cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      initializeDenominations();
      setError(null);
    }
  }, [isOpen, currentInventory]);

  const initializeDenominations = () => {
    // Obtener denominaciones estándar para la moneda
    const standardDenominations = getStandardDenominations(bankAccount.currency);
    
    // Crear mapa del inventario actual
    const currentMap = new Map<number, number>();
    currentInventory.forEach(item => {
      currentMap.set(item.value, item.count);
    });
    
    // Incluir todas las denominaciones estándar y las existentes
    const allValues = new Set([
      ...standardDenominations,
      ...currentInventory.map(item => item.value)
    ]);
    
    const initialDenominations: EditableDenomination[] = Array.from(allValues)
      .sort((a, b) => b - a) // Ordenar de mayor a menor
      .map((value, index) => {
        const count = currentMap.get(value) || 0;
        return {
          id: `denom-${index}`,
          value,
          count,
          total: value * count
        };
      });
    
    setDenominations(initialDenominations);
  };

  const addDenomination = () => {
    const newId = `denom-${Date.now()}`;
    setDenominations(prev => [...prev, {
      id: newId,
      value: 0,
      count: 0,
      total: 0
    }]);
  };

  const removeDenomination = (id: string) => {
    setDenominations(prev => prev.filter(d => d.id !== id));
  };

  const updateDenomination = (id: string, field: 'value' | 'count', newValue: number) => {
    setDenominations(prev => prev.map(denom => {
      if (denom.id === id) {
        const updated = { ...denom, [field]: newValue };
        updated.total = updated.value * updated.count;
        return updated;
      }
      return denom;
    }));
  };

  const totalInventoryValue = denominations.reduce((sum, denom) => sum + denom.total, 0);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validar que no hay denominaciones con valor 0 o negativo que tengan cantidad > 0
      const invalidDenominations = denominations.filter(d => 
        (d.value <= 0 && d.count > 0) || d.count < 0
      );

      if (invalidDenominations.length > 0) {
        setError('Todas las denominaciones deben tener un valor mayor a 0 y cantidad no negativa.');
        return;
      }

      // Filtrar denominaciones que tienen cantidad > 0
      const validDenominations = denominations.filter(d => d.count > 0 && d.value > 0);

      // Guardar en la base de datos
      await setExactInventory(
        bankAccount.id, 
        validDenominations.map(d => ({ value: d.value, count: d.count }))
      );

      // Notificar actualización y cerrar modal
      onInventoryUpdated();
      onClose();

    } catch (err) {
      console.error('Error saving inventory:', err);
      setError('Error al guardar el inventario. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const currentTotal = currentInventory.reduce((sum, item) => sum + item.total, 0);
  const difference = totalInventoryValue - currentTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Inventario de Efectivo</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Cuenta: {bankAccount.bank} - {bankAccount.account_number} ({bankAccount.currency})
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resumen actual vs nuevo */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Inventario Actual</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(currentTotal, bankAccount.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nuevo Inventario</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(totalInventoryValue, bankAccount.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diferencia</p>
                  <p className={`text-lg font-semibold ${
                    difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {difference > 0 ? '+' : ''}{formatCurrency(difference, bankAccount.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor de denominaciones */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Denominaciones</Label>
              <Button variant="outline" size="sm" onClick={addDenomination}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {denominations.map((denomination) => (
                <div key={denomination.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg">
                  <div className="col-span-4">
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={denomination.value || ''}
                      onChange={(e) => updateDenomination(
                        denomination.id, 
                        'value', 
                        parseFloat(e.target.value) || 0
                      )}
                      className="text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={denomination.count || ''}
                      onChange={(e) => updateDenomination(
                        denomination.id, 
                        'count', 
                        parseInt(e.target.value) || 0
                      )}
                      className="text-sm"
                      min="0"
                    />
                  </div>
                  <div className="col-span-4 text-sm">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="font-medium">
                      {formatCurrency(denomination.total, bankAccount.currency)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDenomination(denomination.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advertencia si hay diferencia significativa */}
          {Math.abs(difference) > 0.01 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Se creará una transacción de ajuste de inventario por la diferencia de{' '}
                <strong>{formatCurrency(Math.abs(difference), bankAccount.currency)}</strong>.
                {difference > 0 ? ' Esto aumentará' : ' Esto disminuirá'} el saldo de tu cuenta.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>Guardando...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}