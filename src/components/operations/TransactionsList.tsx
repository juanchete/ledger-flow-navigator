import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/context/TransactionContext";
import { useClients } from "@/context/ClientContext";
import { Transaction, Client } from "@/types";
import { mockDetailedDebts, mockDetailedReceivables } from "@/data/mockData";

interface TransactionsListProps {
  selectedType: string;
  searchQuery: string;
}

interface TransactionFilter {
  type?: Transaction["type"];
  status?: Transaction["status"];
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
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
              tx.description.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="rounded-md border">
      <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50">
        <div className="hidden md:block md:col-span-1 font-medium">Tipo</div>
        <div className="hidden md:block md:col-span-4 font-medium">Descripción</div>
        <div className="hidden md:block md:col-span-2 font-medium">Fecha</div>
        <div className="hidden md:block md:col-span-2 font-medium">Monto</div>
        <div className="hidden md:block md:col-span-2 font-medium">Estado</div>
        <div className="hidden md:block md:col-span-1 font-medium text-right">Acciones</div>
      </div>
      
      <div className="divide-y">
        {isFiltering ? (
          <div className="p-4 text-center text-muted-foreground">
            Aplicando filtros...
          </div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const client = transaction.clientId ? clientsMap[transaction.clientId] : null;
            
            return (
              <div key={transaction.id} className="grid grid-cols-1 md:grid-cols-12 p-4 items-center">
                <div className="md:col-span-1 mb-2 md:mb-0">
                  <Badge className={getBadgeColor(transaction.type)}>
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </Badge>
                </div>
                
                <div className="md:col-span-4 mb-2 md:mb-0">
                  <div className="font-medium">{transaction.description}</div>
                  {client && (
                    <div className="text-sm text-muted-foreground">
                      Cliente: {client.name}
                    </div>
                  )}
                  {transaction.type === 'payment' && transaction.debtId && (
                    <span className="text-xs text-muted-foreground ml-2">Deuda: {mockDetailedDebts.find(d => d.id === transaction.debtId)?.creditor}</span>
                  )}
                  {transaction.type === 'payment' && transaction.receivableId && (
                    <span className="text-xs text-muted-foreground ml-2">Cuenta por Cobrar: {mockDetailedReceivables.find(r => r.id === transaction.receivableId)?.description}</span>
                  )}
                </div>
                
                <div className="md:col-span-2 text-sm mb-2 md:mb-0">
                  {format(new Date(transaction.date), 'MMM d, yyyy')}
                </div>
                
                <div className="md:col-span-2 font-medium mb-2 md:mb-0">
                  {formatCurrency(transaction.amount)}
                </div>
                
                <div className="md:col-span-2 mb-2 md:mb-0">
                  <Badge className={getStatusBadgeColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>
                
                <div className="md:col-span-1 flex justify-end">
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
  );
};
