import { useState, useEffect, useCallback, useRef } from "react";
import { getTransactions } from "@/integrations/supabase/transactionService";
import { getClients } from "@/integrations/supabase/clientService";
import { getDebts } from "@/integrations/supabase/debtService";
import { getReceivables } from "@/integrations/supabase/receivableService";
import { getBankAccounts } from "@/integrations/supabase/bankAccountService";
import { getCalendarEvents } from "@/integrations/supabase/calendarEventService";

// Interfaces para la UI
interface TransactionUI {
  id: string;
  type: string;
  amount: number;
  description?: string;
  date: Date;
  clientId?: string;
  status?: string;
  receipt?: string;
  invoice?: string;
  deliveryNote?: string;
  paymentMethod?: string;
  category?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  indirectForClientId?: string;
  debtId?: string;
  receivableId?: string;
  currency?: string;
  exchange_rate?: number;
}

interface ClientUI {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  clientType?: string;
  active: boolean;
  address?: string;
  contactPerson?: string;
  createdAt?: Date;
  updatedAt?: Date;
  alertStatus?: string;
  alertNote?: string;
  relatedToClientId?: string;
}

interface DebtUI {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status?: string;
  category?: string;
  notes?: string;
  clientId?: string;
  interestRate?: number;
  commission?: number;
  currency?: string;
}

interface ReceivableUI {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status?: string;
  description?: string;
  notes?: string;
  interestRate?: number;
  commission?: number;
  currency?: string;
}

interface BankAccountUI {
  id: string;
  bank: string;
  accountNumber: string;
  amount: number;
  currency: "USD" | "VES";
  historicalCostUsd?: number;
}

interface CalendarEventUI {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  clientId?: string;
  isReminder: boolean;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DashboardData {
  transactions: TransactionUI[];
  clients: ClientUI[];
  debts: DebtUI[];
  receivables: ReceivableUI[];
  bankAccounts: BankAccountUI[];
  events: CalendarEventUI[];
}

interface DashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // en milisegundos
  pauseWhenUserActive?: boolean;
}

export const useDashboardData = (options: DashboardOptions = {}) => {
  const {
    autoRefresh = false, // Cambio por defecto a false
    refreshInterval = 5 * 60 * 1000, // 5 minutos por defecto (mucho menos frecuente)
    pauseWhenUserActive = true,
  } = options;

  const [data, setData] = useState<DashboardData>({
    transactions: [],
    clients: [],
    debts: [],
    receivables: [],
    bankAccounts: [],
    events: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Ref para detectar actividad del usuario
  const lastUserActivity = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para detectar actividad del usuario
  const updateUserActivity = useCallback(() => {
    lastUserActivity.current = Date.now();
  }, []);

  // Detectar actividad del usuario
  useEffect(() => {
    if (pauseWhenUserActive) {
      const events = [
        "mousedown",
        "mousemove",
        "keypress",
        "scroll",
        "touchstart",
        "input",
        "focus",
      ];

      events.forEach((event) => {
        document.addEventListener(event, updateUserActivity, true);
      });

      return () => {
        events.forEach((event) => {
          document.removeEventListener(event, updateUserActivity, true);
        });
      };
    }
  }, [pauseWhenUserActive, updateUserActivity]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, cls, dbts, recs, bks, evs] = await Promise.all([
        getTransactions(),
        getClients(),
        getDebts(),
        getReceivables(),
        getBankAccounts(),
        getCalendarEvents(),
      ]);

      setData({
        transactions: txs.map((t) => ({
          id: t.id,
          type: t.type || "",
          amount: t.amount,
          description: t.description || "",
          date: t.date ? new Date(t.date) : new Date(),
          clientId: t.client_id || undefined,
          status: t.status || undefined,
          receipt: t.receipt || undefined,
          invoice: t.invoice || undefined,
          deliveryNote: t.delivery_note || undefined,
          paymentMethod: t.payment_method || undefined,
          category: t.category || undefined,
          notes: t.notes || undefined,
          createdAt: t.created_at ? new Date(t.created_at) : undefined,
          updatedAt: t.updated_at ? new Date(t.updated_at) : undefined,
          indirectForClientId: t.indirect_for_client_id || undefined,
          debtId: t.debt_id || undefined,
          receivableId: t.receivable_id || undefined,
          currency: t.currency || undefined,
          exchange_rate: (t as any).exchange_rates?.rate || t.custom_exchange_rate || undefined,
        })),
        clients: cls.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email || undefined,
          phone: c.phone || undefined,
          category: c.category || undefined,
          clientType: c.client_type || undefined,
          active: c.active,
          address: c.address || undefined,
          contactPerson: c.contact_person || undefined,
          createdAt: c.created_at ? new Date(c.created_at) : undefined,
          updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
          alertStatus: c.alert_status || undefined,
          alertNote: c.alert_note || undefined,
          relatedToClientId: c.related_to_client_id || undefined,
        })),
        debts: dbts.map((d) => ({
          id: d.id,
          creditor: d.creditor,
          amount: (d as any).amount_usd || d.amount, // Usar amount_usd para el dashboard (siempre en USD)
          dueDate: d.due_date ? new Date(d.due_date) : new Date(),
          status: d.status || undefined,
          category: d.category || undefined,
          notes: d.notes || undefined,
          clientId: d.client_id || undefined,
          interestRate: d.interest_rate || undefined,
          commission: d.commission || undefined,
          currency: d.currency || undefined,
        })),
        receivables: recs.map((r) => ({
          id: r.id,
          clientId: r.client_id,
          amount: (r as any).amount_usd || r.amount, // Usar amount_usd para el dashboard (siempre en USD)
          dueDate: r.due_date ? new Date(r.due_date) : new Date(),
          status: r.status || undefined,
          description: r.description || undefined,
          notes: r.notes || undefined,
          interestRate: r.interest_rate || undefined,
          commission: r.commission || undefined,
          currency: r.currency || undefined,
        })),
        bankAccounts: bks.map((acc) => ({
          id: acc.id,
          bank: acc.bank,
          accountNumber: acc.account_number,
          amount: acc.amount,
          currency: acc.currency === "USD" ? "USD" : "VES",
          historicalCostUsd: acc.historical_cost_usd || 0,
        })),
        events: evs.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description || undefined,
          startDate: e.start_date ? new Date(e.start_date) : new Date(),
          endDate: e.end_date ? new Date(e.end_date) : new Date(),
          category: e.category || undefined,
          clientId: e.client_id || undefined,
          isReminder: e.is_reminder,
          completed: e.completed,
          createdAt: e.created_at ? new Date(e.created_at) : undefined,
          updatedAt: e.updated_at ? new Date(e.updated_at) : undefined,
        })),
      });

      setLastUpdate(Date.now());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para refrescar datos manualmente
  const refreshData = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Función para actualizar solo un tipo de datos específico
  const refreshSpecificData = useCallback(
    async (
      dataType:
        | "transactions"
        | "clients"
        | "debts"
        | "receivables"
        | "bankAccounts"
        | "events"
    ) => {
      try {
        switch (dataType) {
          case "transactions": {
            const txs = await getTransactions();
            setData((prev) => ({
              ...prev,
              transactions: txs.map((t) => ({
                id: t.id,
                type: t.type || "",
                amount: t.amount,
                description: t.description || "",
                date: t.date ? new Date(t.date) : new Date(),
                clientId: t.client_id || undefined,
                status: t.status || undefined,
                receipt: t.receipt || undefined,
                invoice: t.invoice || undefined,
                deliveryNote: t.delivery_note || undefined,
                paymentMethod: t.payment_method || undefined,
                category: t.category || undefined,
                notes: t.notes || undefined,
                createdAt: t.created_at ? new Date(t.created_at) : undefined,
                updatedAt: t.updated_at ? new Date(t.updated_at) : undefined,
                indirectForClientId: t.indirect_for_client_id || undefined,
                debtId: t.debt_id || undefined,
                receivableId: t.receivable_id || undefined,
                currency: t.currency || undefined,
                exchange_rate: (t as any).exchange_rates?.rate || t.custom_exchange_rate || undefined,
              })),
            }));
            break;
          }
          case "bankAccounts": {
            const bks = await getBankAccounts();
            setData((prev) => ({
              ...prev,
              bankAccounts: bks.map((acc) => ({
                id: acc.id,
                bank: acc.bank,
                accountNumber: acc.account_number,
                amount: acc.amount,
                currency: acc.currency === "USD" ? "USD" : "VES",
                historicalCostUsd: acc.historical_cost_usd || 0,
              })),
            }));
            break;
          }
          // Agregar otros casos según sea necesario
        }
        setLastUpdate(Date.now());
      } catch (error) {
        console.error(`Error refreshing ${dataType}:`, error);
      }
    },
    []
  );

  // Cargar datos inicialmente
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh inteligente (solo si está habilitado)
  useEffect(() => {
    if (!autoRefresh) return;

    const startInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        // Solo refrescar si el usuario no ha estado activo recientemente
        const timeSinceLastActivity = Date.now() - lastUserActivity.current;
        const inactiveThreshold = 60 * 1000; // 1 minuto de inactividad

        if (!pauseWhenUserActive || timeSinceLastActivity > inactiveThreshold) {
          console.log("Auto-refreshing dashboard data (user inactive)");
          fetchAllData();
        } else {
          console.log("Skipping auto-refresh (user active)");
        }
      }, refreshInterval);
    };

    startInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, pauseWhenUserActive, fetchAllData]);

  return {
    ...data,
    loading,
    lastUpdate,
    refreshData,
    refreshSpecificData,
  };
};
