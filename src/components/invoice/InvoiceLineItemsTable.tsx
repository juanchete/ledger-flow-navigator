import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

export interface IInvoiceLineItemInput {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

interface IInvoiceLineItemsTableProps {
  items: IInvoiceLineItemInput[];
  onChange: (items: IInvoiceLineItemInput[]) => void;
  currency: string;
  disabled?: boolean;
}

const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'caja', label: 'Caja' },
  { value: 'metro', label: 'Metro' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'kg', label: 'Kg' },
  { value: 'litro', label: 'Litro' },
  { value: 'hora', label: 'Hora' },
  { value: 'dia', label: 'Día' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'proyecto', label: 'Proyecto' },
];

const generateId = (): string => {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const InvoiceLineItemsTable: React.FC<IInvoiceLineItemsTableProps> = ({
  items,
  onChange,
  currency,
  disabled = false,
}) => {
  const formatCurrency = (amount: number): string => {
    const symbol = currency === 'USD' ? '$' : currency === 'VES' ? 'Bs.' : currency;
    return `${symbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const addLine = (): void => {
    const newItem: IInvoiceLineItemInput = {
      id: generateId(),
      description: '',
      quantity: 1,
      unit: 'unidad',
      unitPrice: 0,
      subtotal: 0,
    };
    onChange([...items, newItem]);
  };

  const removeLine = (id: string): void => {
    if (items.length > 1) {
      onChange(items.filter(item => item.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof IInvoiceLineItemInput, value: string | number): void => {
    const updatedItems = items.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Recalculate subtotal when quantity or unitPrice changes
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : item.quantity;
        const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
        updated.subtotal = quantity * unitPrice;
      }

      return updated;
    });

    onChange(updatedItems);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40%]">Descripción</TableHead>
              <TableHead className="w-[10%] text-center">Cantidad</TableHead>
              <TableHead className="w-[15%]">Unidad</TableHead>
              <TableHead className="w-[15%] text-right">Precio Unit.</TableHead>
              <TableHead className="w-[15%] text-right">Subtotal</TableHead>
              <TableHead className="w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    placeholder="Descripción del producto o servicio"
                    value={item.description}
                    onChange={(e) => updateLine(item.id, 'description', e.target.value)}
                    disabled={disabled}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateLine(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="text-center"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.unit}
                    onValueChange={(value) => updateLine(item.id, 'unit', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLine(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.subtotal)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(item.id)}
                    disabled={disabled || items.length <= 1}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addLine}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar Línea
      </Button>
    </div>
  );
};
