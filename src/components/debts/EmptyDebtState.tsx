
import React from 'react';

interface EmptyDebtStateProps {
  message?: string;
}

export const EmptyDebtState: React.FC<EmptyDebtStateProps> = ({
  message = "No se encontraron deudas con los filtros aplicados"
}) => {
  return (
    <div className="text-center py-6 text-muted-foreground">
      {message}
    </div>
  );
};
