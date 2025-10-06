import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wrench, Building2, Laptop } from 'lucide-react';
import { InvoiceRubro } from '@/types/invoice';

interface InvoiceRubroSelectorProps {
  value?: InvoiceRubro;
  onChange: (value: InvoiceRubro) => void;
  disabled?: boolean;
}

const rubroIcons: Record<InvoiceRubro, React.ReactNode> = {
  'Ferretería': <Wrench className="h-5 w-5" />,
  'Construcción': <Building2 className="h-5 w-5" />,
  'Tecnología': <Laptop className="h-5 w-5" />
};

const rubroDescriptions: Record<InvoiceRubro, string> = {
  'Ferretería': 'Herramientas, accesorios y suministros de ferretería',
  'Construcción': 'Materiales de construcción y obras',
  'Tecnología': 'Equipos electrónicos y tecnológicos'
};

export const InvoiceRubroSelector: React.FC<InvoiceRubroSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const rubros: InvoiceRubro[] = ['Ferretería', 'Construcción', 'Tecnología'];

  return (
    <div className="grid gap-3">
      <Label>Rubro de Productos</Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as InvoiceRubro)}
        disabled={disabled}
        className="grid gap-3"
      >
        {rubros.map((rubro) => (
          <div key={rubro}>
            <RadioGroupItem
              value={rubro}
              id={`rubro-${rubro}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`rubro-${rubro}`}
              className={`flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors ${
                value === rubro ? 'border-primary bg-accent' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                value === rubro ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {rubroIcons[rubro]}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{rubro}</div>
                <div className="text-sm text-muted-foreground">
                  {rubroDescriptions[rubro]}
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
      {!value && (
        <p className="text-sm text-muted-foreground">
          Seleccione un rubro para filtrar los productos del catálogo
        </p>
      )}
    </div>
  );
};
