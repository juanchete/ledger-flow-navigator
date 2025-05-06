
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-400 text-yellow-900';
      case 'paid': return 'bg-green-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      default: return 'bg-gray-300 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status === 'pending' ? 'Pendiente' : 
           status === 'paid' ? 'Pagado' : 
           status === 'overdue' ? 'Vencido' : status;
  };

  return (
    <Badge className={`${getStatusColor(status)} ${className || ''}`}>
      {getStatusText(status)}
    </Badge>
  );
};
