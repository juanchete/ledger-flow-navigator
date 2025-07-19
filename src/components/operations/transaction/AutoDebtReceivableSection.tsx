import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Percent, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface AutoDebtReceivableProps {
  transactionType: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  interestRate: string;
  onInterestRateChange: (rate: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const AutoDebtReceivableSection: React.FC<AutoDebtReceivableProps> = ({
  transactionType,
  enabled,
  onEnabledChange,
  dueDate,
  onDueDateChange,
  interestRate,
  onInterestRateChange,
  notes,
  onNotesChange,
}) => {
  // Determinar el tipo basado en el tipo de transacción
  const getDebtReceivableType = () => {
    switch (transactionType) {
      case 'purchase':
      case 'expense':
        return { type: 'debt', label: 'deuda', color: 'text-red-600' };
      case 'sale':
      case 'ingreso':
      case 'cash':
        return { type: 'receivable', label: 'cuenta por cobrar', color: 'text-green-600' };
      default:
        return null;
    }
  };

  const debtReceivableInfo = getDebtReceivableType();

  // No mostrar para tipos que no aplican
  if (!debtReceivableInfo || ['payment', 'balance-change'].includes(transactionType)) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Crear {debtReceivableInfo.label} automáticamente
            </CardTitle>
            <CardDescription>
              Al activar esta opción, se creará una {debtReceivableInfo.label} asociada a esta transacción
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de vencimiento */}
            <div className="space-y-2">
              <Label htmlFor="due-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de vencimiento
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required={enabled}
              />
              <p className="text-xs text-muted-foreground">
                ¿Cuándo vence esta {debtReceivableInfo.label}?
              </p>
            </div>

            {/* Tasa de interés */}
            <div className="space-y-2">
              <Label htmlFor="interest-rate" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Tasa de interés (%)
              </Label>
              <Input
                id="interest-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={interestRate}
                onChange={(e) => onInterestRateChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Opcional: interés mensual aplicable
              </p>
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="debt-notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notas adicionales
            </Label>
            <Textarea
              id="debt-notes"
              placeholder={`Detalles adicionales sobre esta ${debtReceivableInfo.label}...`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Resumen informativo */}
          <div className={`p-3 bg-gray-50 rounded-lg border ${debtReceivableInfo.type === 'debt' ? 'border-red-200' : 'border-green-200'}`}>
            <p className={`text-sm font-medium ${debtReceivableInfo.color}`}>
              Se creará una {debtReceivableInfo.label}:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Por el mismo monto de la transacción</li>
              <li>• Con el mismo cliente seleccionado</li>
              <li>• Fecha de vencimiento: {dueDate ? new Date(dueDate).toLocaleDateString('es-ES') : 'No especificada'}</li>
              {interestRate && parseFloat(interestRate) > 0 && (
                <li>• Tasa de interés: {interestRate}% mensual</li>
              )}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
};