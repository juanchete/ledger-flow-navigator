import { supabase } from "./client";
import { Transaction } from "./transactionService";

export interface IExpenseByCategory {
  category: string;
  categoryLabel: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface IExpenseTrend {
  date: string;
  [category: string]: number | string;
}

// Mapeo de categorías con nombres amigables y colores específicos
export const categoryMapping: { [key: string]: { label: string; color: string; icon: string } } = {
  'office': { label: 'Oficina', color: '#3B82F6', icon: '🏢' },
  'transport': { label: 'Transporte', color: '#10B981', icon: '🚗' },
  'meals': { label: 'Alimentación', color: '#F59E0B', icon: '🍽️' },
  'supplies': { label: 'Suministros', color: '#8B5CF6', icon: '📦' },
  'services': { label: 'Servicios', color: '#EF4444', icon: '⚡' },
  'maintenance': { label: 'Mantenimiento', color: '#06B6D4', icon: '🔧' },
  'marketing': { label: 'Marketing', color: '#EC4899', icon: '📢' },
  'professional': { label: 'Servicios Profesionales', color: '#6366F1', icon: '👨‍💼' },
  'other': { label: 'Otros', color: '#6B7280', icon: '📝' },
  // Categorías adicionales del wizard
  'operacional': { label: 'Gasto Operacional', color: '#059669', icon: '💼' },
  'transporte': { label: 'Transporte', color: '#10B981', icon: '🚗' },
  'personal': { label: 'Personal', color: '#7C3AED', icon: '👤' },
  'alimentacion': { label: 'Alimentación', color: '#F59E0B', icon: '🍕' },
  'salud': { label: 'Salud', color: '#DC2626', icon: '🏥' },
  'entretenimiento': { label: 'Entretenimiento', color: '#DB2777', icon: '🎮' },
  'educacion': { label: 'Educación', color: '#2563EB', icon: '📚' },
  'hogar': { label: 'Hogar', color: '#84CC16', icon: '🏠' },
  'tecnologia': { label: 'Tecnología', color: '#0891B2', icon: '💻' }
};

/**
 * Obtener gastos agrupados por categoría
 */
export async function getExpensesByCategory(
  startDate?: Date,
  endDate?: Date
): Promise<IExpenseByCategory[]> {
  try {
    // Construir query base
    let query = supabase
      .from('transactions')
      .select('*')
      .in('type', ['expense', 'purchase'])
      .eq('status', 'completed');

    // Agregar filtros de fecha si se proporcionan
    if (startDate) {
      query = query.gte('date', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('date', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Agrupar por categoría
    const expensesByCategory: { [key: string]: { amount: number; count: number } } = {};
    let totalAmount = 0;

    data?.forEach((transaction: Transaction) => {
      const category = transaction.category || 'other';
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = { amount: 0, count: 0 };
      }
      expensesByCategory[category].amount += transaction.amount;
      expensesByCategory[category].count += 1;
      totalAmount += transaction.amount;
    });

    // Convertir a formato de respuesta con porcentajes
    const result: IExpenseByCategory[] = Object.entries(expensesByCategory).map(([category, stats]) => {
      const mapping = categoryMapping[category] || {
        label: category.charAt(0).toUpperCase() + category.slice(1),
        color: '#6B7280',
        icon: '📝'
      };

      return {
        category,
        categoryLabel: mapping.label,
        amount: stats.amount,
        count: stats.count,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0,
        color: mapping.color
      };
    });

    // Ordenar por monto descendente
    result.sort((a, b) => b.amount - a.amount);

    return result;
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    throw error;
  }
}

/**
 * Obtener tendencia de gastos por categoría en el tiempo
 */
export async function getExpenseTrend(
  period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  startDate?: Date,
  endDate?: Date
): Promise<IExpenseTrend[]> {
  try {
    // Construir query base
    let query = supabase
      .from('transactions')
      .select('*')
      .in('type', ['expense', 'purchase'])
      .eq('status', 'completed')
      .order('date', { ascending: true });

    // Agregar filtros de fecha si se proporcionan
    if (startDate) {
      query = query.gte('date', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('date', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Agrupar por período y categoría
    const trendData: { [key: string]: IExpenseTrend } = {};

    data?.forEach((transaction: Transaction) => {
      const date = new Date(transaction.date);
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          // Obtener el lunes de la semana
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          periodKey = monday.toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!trendData[periodKey]) {
        trendData[periodKey] = { date: periodKey };
      }

      const category = transaction.category || 'other';
      const categoryLabel = categoryMapping[category]?.label || category;

      trendData[periodKey][categoryLabel] =
        (trendData[periodKey][categoryLabel] as number || 0) + transaction.amount;
    });

    // Convertir a array y ordenar por fecha
    const result = Object.values(trendData).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return result;
  } catch (error) {
    console.error('Error fetching expense trend:', error);
    throw error;
  }
}

/**
 * Obtener resumen de gastos del período actual
 */
export async function getExpenseSummary(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  try {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const expensesByCategory = await getExpensesByCategory(startDate, now);

    const totalAmount = expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0);
    const totalCount = expensesByCategory.reduce((sum, cat) => sum + cat.count, 0);
    const topCategory = expensesByCategory[0] || null;

    // Comparar con período anterior
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);

    switch (period) {
      case 'day':
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'week':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate.setDate(previousEndDate.getDate() - 7);
        break;
      case 'month':
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate.setMonth(previousEndDate.getMonth() - 1);
        break;
      case 'year':
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
        break;
    }

    const previousExpenses = await getExpensesByCategory(previousStartDate, previousEndDate);
    const previousTotal = previousExpenses.reduce((sum, cat) => sum + cat.amount, 0);

    const percentageChange = previousTotal > 0
      ? ((totalAmount - previousTotal) / previousTotal) * 100
      : 0;

    return {
      totalAmount,
      totalCount,
      averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
      topCategory,
      categoriesCount: expensesByCategory.length,
      percentageChange,
      period,
      startDate,
      endDate: now,
      categories: expensesByCategory
    };
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    throw error;
  }
}