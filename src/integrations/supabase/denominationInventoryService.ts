import { supabase } from "./client";
import type { Transaction } from "./transactionService";

export interface DenominationInventory {
  value: number;
  count: number;
  total: number;
}

export interface CashInventoryResult {
  currency: string;
  denominations: DenominationInventory[];
  totalAmount: number;
  lastUpdated: Date;
}

/**
 * Calcula el inventario actual de denominaciones para una cuenta de efectivo
 * basándose en todas las transacciones que incluyen denominaciones
 */
export const calculateCashInventory = async (
  accountId: string,
  debug: boolean = false
): Promise<CashInventoryResult | null> => {
  try {
    // Obtener todas las transacciones con denominaciones para esta cuenta
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('bank_account_id', accountId)
      .not('denominations', 'is', null)
      .order('date', { ascending: true });

    if (error) throw error;

    if (debug) {
      console.log(`[DEBUG] Total transactions with denominations found: ${transactions?.length || 0}`);
      console.log('[DEBUG] Transactions:', transactions);
    }

    if (!transactions || transactions.length === 0) {
      // En modo debug, también obtener todas las transacciones para ver qué hay
      if (debug) {
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('bank_account_id', accountId)
          .order('date', { ascending: true });
        
        console.log(`[DEBUG] Total transactions found: ${allTransactions?.length || 0}`);
        console.log('[DEBUG] All transactions:', allTransactions);
      }
      return null;
    }

    // Obtener la información de la cuenta para determinar la moneda
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('currency')
      .eq('id', accountId)
      .single();

    if (accountError) throw accountError;

    // Crear un mapa para acumular las denominaciones
    const denominationMap = new Map<number, number>();
    let lastTransactionDate = new Date(0);

    // Procesar cada transacción
    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.date);
      if (transactionDate > lastTransactionDate) {
        lastTransactionDate = transactionDate;
      }

      // Solo procesar transacciones en efectivo
      // Las transacciones tipo "cash" son siempre en efectivo, independientemente del payment_method
      // También incluir transacciones con payment_method = 'cash'
      if (transaction.type !== 'cash' && transaction.payment_method !== 'cash') {
        if (debug) {
          console.log(`[DEBUG] Skipping transaction ${transaction.id} - type: ${transaction.type}, payment_method: ${transaction.payment_method}`);
        }
        continue;
      }

      const denominations = transaction.denominations as any;
      if (!denominations || typeof denominations !== 'object') {
        if (debug) {
          console.log(`[DEBUG] Transaction ${transaction.id} has invalid denominations:`, denominations);
        }
        continue;
      }

      if (debug) {
        console.log(`[DEBUG] Processing transaction ${transaction.id}:`, {
          type: transaction.type,
          payment_method: transaction.payment_method,
          denominations: denominations
        });
      }

      // Determinar si es entrada o salida de efectivo
      const isIncome = ['sale', 'payment', 'cash', 'ingreso'].includes(transaction.type || '');
      const multiplier = isIncome ? 1 : -1;

      // Procesar denominaciones - ahora manejando formato de objeto {valor: cantidad}
      for (const [valueStr, countValue] of Object.entries(denominations)) {
        // Ignorar propiedades del prototype
        if (denominations.hasOwnProperty(valueStr)) {
          const value = parseFloat(valueStr);
          const count = parseInt(countValue as string);
          
          if (debug) {
            console.log(`[DEBUG] Processing denomination: ${valueStr} = ${countValue}, parsed: value=${value}, count=${count}`);
          }
          
          if (!isNaN(value) && !isNaN(count) && value > 0 && count > 0) {
            const currentCount = denominationMap.get(value) || 0;
            const newCount = currentCount + (count * multiplier);
            denominationMap.set(value, newCount);
            
            if (debug) {
              console.log(`[DEBUG] Updated denomination ${value}: ${currentCount} -> ${newCount}`);
            }
          }
        }
      }
    }

    // Convertir el mapa a array y filtrar denominaciones negativas o cero
    const denominationsArray: DenominationInventory[] = [];
    let totalAmount = 0;

    denominationMap.forEach((count, value) => {
      if (count > 0) {
        const total = value * count;
        denominationsArray.push({
          value,
          count,
          total
        });
        totalAmount += total;
      }
    });

    // Ordenar por valor descendente
    denominationsArray.sort((a, b) => b.value - a.value);

    return {
      currency: account.currency,
      denominations: denominationsArray,
      totalAmount,
      lastUpdated: lastTransactionDate
    };

  } catch (error) {
    console.error('Error calculating cash inventory:', error);
    throw error;
  }
};

/**
 * Verifica si una cuenta es una cuenta de efectivo basándose en su nombre
 */
export const isCashAccount = (account: { bank: string; account_number: string }): boolean => {
  const bankLower = account.bank.toLowerCase();
  const accountNumberLower = account.account_number.toLowerCase();
  
  return bankLower.includes('cash') || 
         bankLower.includes('efectivo') || 
         accountNumberLower.includes('cash') ||
         accountNumberLower.includes('efectivo');
};

/**
 * Obtiene las denominaciones estándar para una moneda
 */
export const getStandardDenominations = (currency: string): number[] => {
  switch (currency) {
    case 'USD':
      return [100, 50, 20, 10, 5, 1];
    case 'EUR':
      return [500, 200, 100, 50, 20, 10, 5];
    case 'VES':
      return [1000000, 500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];
    default:
      return [100, 50, 20, 10, 5, 1];
  }
};

/**
 * Crea una transacción de ajuste de inventario para corregir las denominaciones de efectivo
 * Esta transacción especial permite ajustar el inventario sin afectar el saldo total
 */
export const createInventoryAdjustment = async (
  accountId: string,
  currentInventory: DenominationInventory[],
  newInventory: DenominationInventory[],
  reason: string = 'Ajuste manual de inventario de denominaciones'
): Promise<void> => {
  try {
    // Calcular las diferencias entre inventario actual y nuevo
    const adjustments: Record<string, number> = {};
    
    // Crear un mapa del inventario actual
    const currentMap = new Map<number, number>();
    currentInventory.forEach(item => {
      currentMap.set(item.value, item.count);
    });
    
    // Calcular ajustes necesarios
    newInventory.forEach(item => {
      const currentCount = currentMap.get(item.value) || 0;
      const difference = item.count - currentCount;
      
      if (difference !== 0) {
        adjustments[item.value.toString()] = Math.abs(difference);
      }
    });
    
    // Si no hay ajustes, no hacer nada
    if (Object.keys(adjustments).length === 0) {
      return;
    }
    
    // Obtener información de la cuenta
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('currency')
      .eq('id', accountId)
      .single();
      
    if (accountError) throw accountError;
    
    // Calcular el monto total del ajuste
    const totalAdjustment = newInventory.reduce((sum, item) => sum + item.total, 0) - 
                           currentInventory.reduce((sum, item) => sum + item.total, 0);
    
    // Crear transacción de ajuste
    const transactionData = {
      type: totalAdjustment >= 0 ? 'cash' : 'expense',
      amount: Math.abs(totalAdjustment),
      description: reason,
      date: new Date().toISOString(),
      status: 'completed',
      payment_method: 'cash',
      bank_account_id: accountId,
      currency: account.currency,
      denominations: adjustments,
      category: 'inventory_adjustment',
      notes: `Ajuste de inventario de denominaciones. Diferencia: ${totalAdjustment >= 0 ? '+' : '-'}${Math.abs(totalAdjustment)}`
    };
    
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([transactionData]);
      
    if (insertError) throw insertError;
    
  } catch (error) {
    console.error('Error creating inventory adjustment:', error);
    throw error;
  }
};

/**
 * Establece el inventario exacto de denominaciones mediante una transacción de ajuste
 */
export const setExactInventory = async (
  accountId: string,
  targetInventory: { value: number; count: number }[]
): Promise<void> => {
  try {
    // Obtener inventario actual
    const currentResult = await calculateCashInventory(accountId);
    const currentInventory = currentResult?.denominations || [];
    
    // Convertir inventario objetivo al formato correcto
    const targetInventoryFormatted: DenominationInventory[] = targetInventory.map(item => ({
      value: item.value,
      count: item.count,
      total: item.value * item.count
    }));
    
    // Crear ajuste
    await createInventoryAdjustment(
      accountId,
      currentInventory,
      targetInventoryFormatted,
      'Ajuste manual: establecer inventario exacto'
    );
    
  } catch (error) {
    console.error('Error setting exact inventory:', error);
    throw error;
  }
};