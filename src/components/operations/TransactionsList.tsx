import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/context/TransactionContext";
import { useClients } from "@/context/ClientContext";
import { type Transaction, type TransactionFilter } from "@/integrations/supabase/transactionService";
import { Client } from "@/types";
import { mockDetailedDebts, mockDetailedReceivables } from "@/data/mockData";

interface TransactionsListProps {
  selectedType: string;
  searchQuery: string;
}

export const TransactionsList = ({ selectedType, searchQuery }: TransactionsListProps) => {
  const { transactions, isLoading, error, filterTransactions } = useTransactions();
  const { clients } = useClients();
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});

  // Crear un mapa de clientes por ID para búsqueda rápida
  useEffect(() => {
    const map: Record<string, Client> = {};
    clients.forEach(client => {
      map[client.id] = client;
    });
    setClientsMap(map);
  }, [clients]);

  useEffect(() => {
    // Aplicar filtros locales cuando cambia la selección de tipo o búsqueda
    const applyFilters = async () => {
      setIsFiltering(true);
      try {
        if (selectedType === "all" && !searchQuery) {
          // Si no hay filtros activos, usar las transacciones del contexto
          setFilteredTransactions(transactions);
        } else {
          // Si hay una búsqueda o filtro por tipo, usar la API
          const filters: TransactionFilter = {};
          if (selectedType !== "all") {
            filters.type = selectedType as Transaction["type"];
          }
          
          // Si hay término de búsqueda, usarlo para filtrar por descripción
          let results = await filterTransactions(filters);
          if (searchQuery) {
            results = results.filter(tx => 
              tx.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          setFilteredTransactions(results);
        }
      } catch (error) {
        console.error("Error al aplicar filtros:", error);
      } finally {
        setIsFiltering(false);
      }
    };

    applyFilters();
  }, [selectedType, searchQuery, transactions, filterTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBadgeColor = (transactionType: string) => {
    switch(transactionType) {
      case 'purchase':
        return 'bg-finance-red-light text-white';
      case 'sale':
        return 'bg-finance-green text-white';
      case 'banking':
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
          <div className="col-span-4">Descripción</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-2">Monto</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1 text-right">Acciones</div>
        </div>
        
        <div className="divide-y">
          {isFiltering ? (
            <div className="p-4 text-center text-muted-foreground">
              Aplicando filtros...
            </div>
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const client = transaction.client_id ? clientsMap[transaction.client_id] : null;
              
              return (
                <div key={transaction.id} className="grid grid-cols-12 p-4 items-center hover:bg-muted/25 transition-colors">
                  <div className="col-span-1">
                    <Badge className={getBadgeColor(transaction.type || '')}>
                      {transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : 'N/A'}
                    </Badge>
                  </div>
                  
                  <div className="col-span-4">
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
                  
                  <div className="col-span-2">
                    <Badge className={getStatusBadgeColor(transaction.status || '')}>
                      {transaction.status || 'Sin estado'}
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
            <div className="p-4 text-center text-muted-foreground">
              No se encontraron transacciones.
            </div>
          )}
        </div>
      </div>

      {/* Vista de tarjetas para pantallas pequeñas */}
      <div className="md:hidden space-y-3">
        {isFiltering ? (
          <div className="p-4 text-center text-muted-foreground">
            Aplicando filtros...
          </div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const client = transaction.client_id ? clientsMap[transaction.client_id] : null;
            
            return (
              <div key={transaction.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge className={getBadgeColor(transaction.type || '')} variant="secondary">
                      {transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : 'N/A'}
                    </Badge>
                    <Badge className={getStatusBadgeColor(transaction.status || '')} variant="outline">
                      {transaction.status || 'Sin estado'}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/operations/transaction/${transaction.id}`}>Ver</Link>
                  </Button>
                </div>
                
                <div>
                  <div className="font-medium text-sm mb-1">{transaction.description || 'Sin descripción'}</div>
                  {client && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Cliente: {client.name}
                    </div>
                  )}
                  {transaction.type === 'payment' && transaction.debt_id && (
                    <div className="text-xs text-muted-foreground">Deuda: {mockDetailedDebts.find(d => d.id === transaction.debt_id)?.creditor}</div>
                  )}
                  {transaction.type === 'payment' && transaction.receivable_id && (
                    <div className="text-xs text-muted-foreground">Cuenta por Cobrar: {mockDetailedReceivables.find(r => r.id === transaction.receivable_id)?.description}</div>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {transaction.date ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Sin fecha'}
                  </span>
                  <span className="font-medium text-lg">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground border rounded-lg">
            No se encontraron transacciones.
          </div>
        )}
      </div>
    </div>
  );
};
