import { supabase } from "@/integrations/supabase/client";

/**
 * Función de debug para examinar las transacciones y denominaciones en la base de datos
 */
export const debugTransactions = async (accountId: string) => {
  try {
    console.log('=== DEBUG: Database Analysis ===');
    
    // 1. Obtener información de la cuenta
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
      
    if (accountError) {
      console.error('Error getting account:', accountError);
      return;
    }
    
    console.log('Account info:', account);
    
    // 2. Obtener todas las transacciones para esta cuenta
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .eq('bank_account_id', accountId)
      .order('date', { ascending: false });
      
    if (allError) {
      console.error('Error getting all transactions:', allError);
      return;
    }
    
    console.log(`Total transactions found: ${allTransactions?.length || 0}`);
    
    // 3. Filtrar transacciones con denominaciones no null
    const transactionsWithDenominations = allTransactions?.filter(t => t.denominations !== null) || [];
    console.log(`Transactions with non-null denominations: ${transactionsWithDenominations.length}`);
    
    // 4. Analizar cada transacción con denominaciones
    transactionsWithDenominations.forEach((transaction, index) => {
      console.log(`\n--- Transaction ${index + 1} ---`);
      console.log('ID:', transaction.id);
      console.log('Date:', transaction.date);
      console.log('Type:', transaction.type);
      console.log('Payment Method:', transaction.payment_method);
      console.log('Amount:', transaction.amount);
      console.log('Currency:', transaction.currency);
      console.log('Description:', transaction.description);
      console.log('Raw denominations:', transaction.denominations);
      console.log('Denominations type:', typeof transaction.denominations);
      
      if (transaction.denominations) {
        try {
          // Si es string, intentar parsear
          if (typeof transaction.denominations === 'string') {
            const parsed = JSON.parse(transaction.denominations);
            console.log('Parsed denominations:', parsed);
          } else {
            // Si ya es objeto
            console.log('Object denominations:', transaction.denominations);
          }
        } catch (e) {
          console.log('Error parsing denominations:', e);
        }
      }
    });
    
    // 5. Analizar todas las transacciones en efectivo (independientemente de si tienen denominaciones)
    const cashTransactions = allTransactions?.filter(t => 
      t.type === 'cash' || t.payment_method === 'cash'
    ) || [];
    
    console.log(`\n=== Cash Transactions Analysis ===`);
    console.log(`Total cash transactions: ${cashTransactions.length}`);
    
    cashTransactions.forEach((transaction, index) => {
      console.log(`\nCash Transaction ${index + 1}:`);
      console.log('- ID:', transaction.id);
      console.log('- Type:', transaction.type);
      console.log('- Payment Method:', transaction.payment_method);
      console.log('- Has denominations:', transaction.denominations !== null);
      console.log('- Amount:', transaction.amount);
      console.log('- Currency:', transaction.currency);
    });
    
    return {
      account,
      totalTransactions: allTransactions?.length || 0,
      transactionsWithDenominations: transactionsWithDenominations.length,
      cashTransactions: cashTransactions.length,
      transactionsWithDenominations: transactionsWithDenominations,
      cashTransactions
    };
    
  } catch (error) {
    console.error('Debug error:', error);
  }
};