
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateEs } from "@/lib/utils";

interface DebtMetadataProps {
  dueDate: Date;
  status: string;
  notes: string;
  onStatusChange: (value: string) => void;
  onNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const DebtMetadata: React.FC<DebtMetadataProps> = ({
  dueDate,
  status,
  notes,
  onStatusChange,
  onNotesChange
}) => {
  const formatDate = (date: Date) => {
    return formatDateEs(date, 'dd/MM/yyyy');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha de Vencimiento</Label>
          <p>{formatDate(dueDate)}</p>
        </div>
        <div>
          <Label htmlFor="status">Estado</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea 
          id="notes"
          value={notes}
          onChange={onNotesChange}
          rows={2}
        />
      </div>
    </div>
  );
};
