import { useMemo } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/context/TransactionContext";
import { useClients } from "@/context/ClientContext";
import { type Transaction } from "@/integrations/supabase/transactionService";
import { Client } from "@/types";
import { mockDetailedDebts, mockDetailedReceivables } from "@/data/mockData";

interface TransactionsListProps {
  selectedType: string;
  searchQuery: string;
  selectedPaymentMethod: string;
}

// ✅ FUNCIONES HELPER FUERA DEL COMPONENTE para evitar recreación
const normalizePaymentMethod = (method: string): string => {
  switch(method.toLowerCase()) {
    case 'efectivo':
    case 'cash':
      return 'cash';
    case 'transferencia':
    case 'transfer':
      return 'transfer';
    case 'tarjeta de crédito':
    case 'credit_card':
      return 'credit_card';
    case 'debit_card':
      return 'other'; // Mapeamos debit_card a "otro"
    default:
      return 'other';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const getTransactionTypeLabel = (type: string) => {
  switch(type) {
    case 'purchase':
      return 'Compra';
    case 'sale':
      return 'Venta';
    case 'cash':
      return 'Efectivo';
    case 'balance-change':
      return 'Cambio de Saldo';
    case 'expense':
      return 'Gasto';
    case 'payment':
      return 'Pago';
    default:
      return type || 'N/A';
  }
};

const getStatusLabel = (status: string) => {
  switch(status) {
    case 'completed':
      return 'Completado';
    case 'pending':
      return 'Pendiente';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status || 'Sin estado';
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch(method?.toLowerCase()) {
    case 'cash':
    case 'efectivo':
      return 'Efectivo';
    case 'transfer':
    case 'transferencia':
      return 'Transferencia';
    case 'credit_card':
    case 'tarjeta de crédito':
      return 'Tarjeta de Crédito';
    case 'debit_card':
      return 'Tarjeta de Débito';
    default:
      return method || 'N/A';
  }
};

const getBadgeColor = (transactionType: string) => {
  switch(transactionType) {
    case 'purchase':
      return 'bg-finance-red-light text-white';
    case 'sale':
      return 'bg-finance-green text-white';
    case 'cash':
      return 'bg-finance-blue text-white';
    case 'balance-change':
      return 'bg-finance-yellow text-finance-gray-dark';
    case 'expense':
      return 'bg-finance-gray text-white';
    case 'payment':
      return 'bg-finance-purple text-white';
    default:
      return '';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch(status) {
    case 'completed':
      return 'bg-finance-green text-white';
    case 'pending':
      return 'bg-finance-yellow text-finance-gray-dark';
    case 'cancelled':
      return 'bg-finance-red text-white';
    default:
      return '';
  }
};

const getTransactionIcon = (type: string) => {
  switch(type) {
    case 'purchase':
      return '🛒';
    case 'sale':
      return '💰';
    case 'cash':
      return '💵';
    case 'balance-change':
      return '🔄';
    case 'expense':
      return '💸';
    case 'payment':
      return '💳';
    default:
      return '📝';
  }
};

export const TransactionsList = ({ selectedType, searchQuery, selectedPaymentMethod }: TransactionsListProps) => {
  const { transactions, isLoading, error } = useTransactions();
  const { clients } = useClients();

  // ✅ DEBUGGING: Según React docs - console.log para debuggear dependencias
  console.log('[DEBUG] TransactionsList dependencies:', {
    transactionsLength: transactions.length,
    selectedType,
    selectedPaymentMethod,
    searchQuery,
    clientsLength: clients.length
  });

  // ✅ CORRECTO: Según React docs - usar dependencias primitivas y estables
  const filteredTransactions = useMemo(() => {
    // ✅ Measuring performance según React docs
    console.time('filter transactions');
    
    if (!transactions.length) {
      console.timeEnd('filter transactions');
      return [];
    }

    const result = transactions.filter(transaction => {
      // Filtro por tipo
      if (selectedType !== "all" && transaction.type !== selectedType) {
        return false;
      }

      // Filtro por método de pago - ✅ CORREGIDO: Mapeo correcto
      if (selectedPaymentMethod !== "all") {
        const normalizedPaymentMethod = normalizePaymentMethod(transaction.payment_method || '');
        if (normalizedPaymentMethod !== selectedPaymentMethod) {
          return false;
        }
      }

      // Filtro por búsqueda de texto - ✅ OPTIMIZADO: buscar cliente por ID directo
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const descriptionMatch = transaction.description?.toLowerCase().includes(searchLower);
        const notesMatch = transaction.notes?.toLowerCase().includes(searchLower);
        
        // ✅ Búsqueda optimizada de cliente
        let clientMatch = false;
        if (transaction.client_id) {
          const client = clients.find(c => c.id === transaction.client_id);
          clientMatch = client?.name?.toLowerCase().includes(searchLower) || false;
        }
        
        if (!descriptionMatch && !notesMatch && !clientMatch) {
          return false;
        }
      }

      return true;
    });

    console.timeEnd('filter transactions');
    console.log(`[PERFORMANCE] Filtered ${transactions.length} → ${result.length} transactions`);
    return result;
  }, [
    // ✅ CORRECTO: Solo dependencias primitivas que realmente cambian
    transactions.length, // En lugar del array completo
    selectedType,
    selectedPaymentMethod,
    searchQuery,
    clients.length, // En lugar del array completo
    // ✅ Para invalidar cuando el contenido de clientes cambia, usar un ID hash
    clients.map(c => c.id + c.name).join(',') // Hash estable de clientes
  ]);

  // Mostrar un indicador de carga mientras se cargan las transacciones iniciales
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Cargando transacciones...
      </div>
    );
  }

  // Mostrar un mensaje de error si hay un problema al cargar las transacciones
  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error al cargar las transacciones: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vista de tabla para pantallas medianas y grandes */}
      <div className="hidden md:block rounded-md border">
        <div className="grid grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
          <div className="col-span-1">Tipo</div>
          <div className="col-span-3">Descripción</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-2">Monto</div>
          <div className="col-span-2">Método</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-1 text-right">Acciones</div>
        </div>
        
        <div className="divide-y">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const client = transaction.client_id ? clients.find(c => c.id === transaction.client_id) : null;
              
              return (
                <div key={transaction.id} className="grid grid-cols-12 p-4 items-center hover:bg-muted/25 transition-colors">
                  <div className="col-span-1">
                    <Badge className={getBadgeColor(transaction.type || '')}>
                      {getTransactionTypeLabel(transaction.type || '')}
                    </Badge>
                  </div>
                  
                  <div className="col-span-3">
                    <div className="font-medium truncate">{transaction.description || 'Sin descripción'}</div>
                    {client && (
                      <div className="text-sm text-muted-foreground truncate">
                        Cliente: {client.name}
                      </div>
                    )}
                    {transaction.type === 'payment' && transaction.debt_id && (
                      <span className="text-xs text-muted-foreground">Deuda: {mockDetailedDebts.find(d => d.id === transaction.debt_id)?.creditor}</span>
                    )}
                    {transaction.type === 'payment' && transaction.receivable_id && (
                      <span className="text-xs text-muted-foreground">Cuenta por Cobrar: {mockDetailedReceivables.find(r => r.id === transaction.receivable_id)?.description}</span>
                    )}
                  </div>
                  
                  <div className="col-span-2 text-sm">
                    {transaction.date ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Sin fecha'}
                  </div>
                  
                  <div className="col-span-2 font-medium">
                    {formatCurrency(transaction.amount)}
                  </div>
                  
                  <div className="col-span-2 text-sm">
                    {getPaymentMethodLabel(transaction.payment_method || '')}
                  </div>
                  
                  <div className="col-span-1">
                    <Badge className={getStatusBadgeColor(transaction.status || '')}>
                      {getStatusLabel(transaction.status || '')}
                    </Badge>
                  </div>
                  
                  <div className="col-span-1 flex justify-end">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/operations/transaction/${transaction.id}`}>Ver</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No se encontraron transacciones con los filtros aplicados.
            </div>
          )}
        </div>
      </div>

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const client = transaction.client_id ? clients.find(c => c.id === transaction.client_id) : null;
            
            return (
              <div key={transaction.id} className="bg-card text-card-foreground rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge className={getBadgeColor(transaction.type || '')}>
                    {getTransactionTypeLabel(transaction.type || '')}
                  </Badge>
                  <Badge className={getStatusBadgeColor(transaction.status || '')}>
                    {getStatusLabel(transaction.status || '')}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="font-medium truncate">{transaction.description || 'Sin descripción'}</h3>
                  {client && (
                    <p className="text-sm text-muted-foreground truncate">
                      Cliente: {client.name}
                    </p>
                  )}
                  {transaction.type === 'payment' && transaction.debt_id && (
                    <p className="text-xs text-muted-foreground">Deuda: {mockDetailedDebts.find(d => d.id === transaction.debt_id)?.creditor}</p>
                  )}
                  {transaction.type === 'payment' && transaction.receivable_id && (
                    <p className="text-xs text-muted-foreground">Cuenta por Cobrar: {mockDetailedReceivables.find(r => r.id === transaction.receivable_id)?.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha: </span>
                    {transaction.date ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Sin fecha'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monto: </span>
                    <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Método: </span>
                    {getPaymentMethodLabel(transaction.payment_method || '')}
                  </div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/operations/transaction/${transaction.id}`}>Ver Detalles</Link>
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No se encontraron transacciones con los filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
};
