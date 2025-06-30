import React, { useState } from 'react';
import { useTransactionWizard } from '@/contexts/TransactionWizardContext';
import { TRANSACTION_TYPE_CONFIGS } from '@/types/wizard';

// UI Components
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Calendar, FileText, DollarSign, Repeat } from 'lucide-react';

export const AdditionalInfoStep: React.FC = () => {
  const { data, updateData } = useTransactionWizard();
  const [selectedFile, setSelectedFile] = useState<File | null>(data.receipt || null);

  if (!data.transactionType) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Primero debes seleccionar un tipo de transacción</p>
      </div>
    );
  }

  const config = TRANSACTION_TYPE_CONFIGS[data.transactionType];
  const isBalanceChange = data.transactionType === 'balance-change';

  const handleDateChange = (date: string) => {
    updateData({ date });
  };

  const handleReferenceChange = (reference: string) => {
    updateData({ reference });
  };

  const handleNotesChange = (notes: string) => {
    updateData({ notes });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    updateData({ receipt: file });
  };

  const handleBankCommissionChange = (commission: string) => {
    updateData({ bankCommission: commission });
  };

  const handleTransferCountChange = (count: string) => {
    updateData({ transferCount: count });
  };

  return (
    <div className="space-y-4">

      <div className="space-y-4">
        {/* Fecha de la transacción */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fecha de la Transacción
            </CardTitle>
            <CardDescription>¿Cuándo se realizó esta transacción?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">Fecha</Label>
              <Input
                type="date"
                value={data.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Referencia/Descripción adicional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Referencia o Descripción
            </CardTitle>
            <CardDescription>
              Agrega una referencia o descripción adicional para identificar mejor esta transacción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">Referencia (opcional)</Label>
              <Input
                type="text"
                placeholder="Ej: Factura #001, Pago servicios, etc."
                value={data.reference || ''}
                onChange={(e) => handleReferenceChange(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Campos específicos para balance-change */}
        {isBalanceChange && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Detalles de Transferencia
              </CardTitle>
              <CardDescription>
                Información adicional sobre la transferencia entre cuentas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Comisión Bancaria (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={data.bankCommission || '0'}
                    onChange={(e) => handleBankCommissionChange(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Porcentaje de comisión aplicado por el banco
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Número de Transferencias</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={data.transferCount || '1'}
                    onChange={(e) => handleTransferCountChange(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Si se realizaron múltiples transferencias
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comprobante/Recibo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Comprobante o Recibo
            </CardTitle>
            <CardDescription>
              Sube una foto del comprobante o recibo de la transacción (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="receipt-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG o PDF (MAX. 10MB)</p>
                  </div>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                      <p className="text-xs text-green-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      updateData({ receipt: null });
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notas adicionales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notas Adicionales
            </CardTitle>
            <CardDescription>
              Agrega cualquier comentario o nota adicional sobre esta transacción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">Notas (opcional)</Label>
              <Textarea
                placeholder="Escribe cualquier información adicional que consideres importante..."
                value={data.notes || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-gray-500">
                Máximo 500 caracteres ({(data.notes || '').length}/500)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de información adicional */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Información adicional configurada:</h3>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Fecha: {data.date ? new Date(data.date).toLocaleDateString('es-ES') : 'No especificada'}</span>
            </div>
            {data.reference && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Referencia: {data.reference}</span>
              </div>
            )}
            {selectedFile && (
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>Comprobante: {selectedFile.name}</span>
              </div>
            )}
            {data.notes && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Notas agregadas</span>
              </div>
            )}
            {isBalanceChange && (data.bankCommission || data.transferCount !== '1') && (
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <span>
                  Detalles de transferencia: 
                  {data.bankCommission && ` Comisión ${data.bankCommission}%`}
                  {data.transferCount !== '1' && ` - ${data.transferCount} transferencias`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 