/**
 * Utilidades para cálculo de intereses y validación de rentabilidad
 */

export interface InterestCalculation {
  principal: number;
  interestRate: number; // Porcentaje anual
  installments: number;
  totalAmount: number;
  totalInterest: number;
  monthlyPayment: number;
  effectiveAnnualRate: number;
  profitabilityPercentage: number;
  isMinimumProfitable: boolean; // Si cumple con el 10% mínimo
  warningMessage?: string;
}

/**
 * Calcula los intereses y valida la rentabilidad mínima del 10%
 */
export function calculateInterest(
  principal: number,
  annualInterestRate: number,
  installments: number
): InterestCalculation {
  // Validaciones básicas
  if (principal <= 0 || annualInterestRate < 0 || installments <= 0) {
    throw new Error("Los valores deben ser positivos");
  }

  // Convertir tasa anual a mensual
  const monthlyRate = annualInterestRate / 100 / 12;

  // Calcular pago mensual usando la fórmula de amortización
  let monthlyPayment: number;
  let totalAmount: number;

  if (monthlyRate === 0) {
    // Sin interés
    monthlyPayment = principal / installments;
    totalAmount = principal;
  } else {
    // Con interés compuesto
    monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, installments))) /
      (Math.pow(1 + monthlyRate, installments) - 1);
    totalAmount = monthlyPayment * installments;
  }

  const totalInterest = totalAmount - principal;

  // Calcular tasa efectiva anual
  const effectiveAnnualRate =
    (totalAmount / principal - 1) * (12 / installments) * 100;

  // Calcular porcentaje de ganancia
  const profitabilityPercentage = (totalInterest / principal) * 100;

  // Validar rentabilidad mínima del 10%
  const isMinimumProfitable = profitabilityPercentage >= 10;

  let warningMessage: string | undefined;
  if (!isMinimumProfitable) {
    warningMessage = `⚠️ ALERTA: La rentabilidad es del ${profitabilityPercentage.toFixed(
      2
    )}%, menor al 10% mínimo requerido. Se recomienda ajustar la tasa de interés.`;
  }

  return {
    principal,
    interestRate: annualInterestRate,
    installments,
    totalAmount,
    totalInterest,
    monthlyPayment,
    effectiveAnnualRate,
    profitabilityPercentage,
    isMinimumProfitable,
    warningMessage,
  };
}

/**
 * Calcula la tasa de interés mínima necesaria para obtener 10% de rentabilidad
 */
export function calculateMinimumInterestRate(
  principal: number,
  installments: number
): number {
  // Para obtener 10% de ganancia, el total debe ser principal * 1.10
  const targetTotal = principal * 1.1;

  // Usar búsqueda binaria para encontrar la tasa que da el total objetivo
  let low = 0;
  let high = 100; // 100% anual máximo
  const tolerance = 0.01;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const calculation = calculateInterest(principal, mid, installments);

    if (calculation.totalAmount < targetTotal) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Formatea un número como porcentaje
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formatea un número como moneda
 */
export function formatCurrency(
  value: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
