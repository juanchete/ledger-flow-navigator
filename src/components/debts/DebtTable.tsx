
import React from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/operations/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from '@/lib/utils';
import { UserPlus, Users, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

interface Client {
  id: string;
  name: string;
  clientType: 'direct' | 'indirect';
}

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
  relatedClientId?: string;
  payingClients?: Client[];
}

interface DebtTableProps {
  debts: Debt[];
  formatDate: (date: Date) => string;
  onDebtClick: (debt: Debt) => void;
}

export const DebtTable: React.FC<DebtTableProps> = ({
  debts,
  formatDate,
  onDebtClick
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Acreedor</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Fecha de Vencimiento</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Clientes</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {debts.length > 0 ? (
          debts.map((debt) => (
            <TableRow key={debt.id}>
              <TableCell className="font-medium">{debt.creditor}</TableCell>
              <TableCell>{debt.category}</TableCell>
              <TableCell>{formatCurrency(debt.amount)}</TableCell>
              <TableCell>{formatDate(debt.dueDate)}</TableCell>
              <TableCell>
                <StatusBadge status={debt.status} />
              </TableCell>
              <TableCell>
                {debt.payingClients && debt.payingClients.length > 0 ? (
                  <div className="space-y-1">
                    {debt.payingClients.some(client => client.clientType === 'indirect') && (
                      <Badge variant="outline" className="mr-1 bg-yellow-50">
                        <Users size={12} className="mr-1" />
                        Indirecto
                      </Badge>
                    )}
                    {debt.payingClients.some(client => client.clientType === 'direct') && (
                      <Badge variant="outline" className="mr-1 bg-slate-50">
                        <UserRound size={12} className="mr-1" />
                        Directo
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {debt.payingClients.length} cliente(s)
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {debt.payingClients.slice(0, 2).map((client) => (
                        <Link 
                          key={client.id} 
                          to={`/clients/${client.id}`} 
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {client.clientType === 'indirect' ? (
                            <Users size={10} />
                          ) : (
                            <UserRound size={10} />
                          )}
                          {client.name}
                        </Link>
                      ))}
                      {debt.payingClients.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{debt.payingClients.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <Badge variant="outline" className="bg-slate-50">
                    <UserRound size={12} className="mr-1" />
                    Directo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                >
                  <Link to={`/all-debts/${debt.id}`}>
                    Ver Detalle
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
              No se encontraron deudas con los filtros aplicados
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
