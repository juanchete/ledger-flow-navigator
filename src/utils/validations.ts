// Utilidades de validación para el sistema de contabilidad

interface Denomination {
  id: string;
  value: number;
  count: number;
}

interface CashValidationResult {
  isValid: boolean;
  errors: string[];
  calculatedAmount: number;
  expectedAmount: number;
}

/**
 * Valida las denominaciones de billetes para transacciones en efectivo
 * @param denominations Array de denominaciones con valor y cantidad
 * @param expectedAmount Monto esperado que debe coincidir con el total de denominaciones
 * @param currency Moneda de la transacción
 * @param paymentMethod Método de pago
 * @returns Resultado de la validación con errores específicos
 */
export function validateCashDenominations(
  denominations: Denomination[],
  expectedAmount: number,
  currency: string,
  paymentMethod: string
): CashValidationResult {
  const errors: string[] = [];
  
  // Si no es transacción en efectivo con USD/EUR, no se requiere validación
  if (paymentMethod !== 'cash' || !['USD', 'EUR'].includes(currency)) {
    return {
      isValid: true,
      errors: [],
      calculatedAmount: expectedAmount,
      expectedAmount
    };
  }

  // Calcular el monto total basado en denominaciones
  const calculatedAmount = denominations.reduce((total, den) => {
    return total + (den.value * den.count);
  }, 0);

  // Validar que hay al menos una denominación activa
  const activeDenominations = denominations.filter(den => den.value > 0 && den.count > 0);
  if (activeDenominations.length === 0) {
    errors.push('Debes especificar al menos una denominación de billete cuando pagas en efectivo.');
  }

  // Validar que no hay valores negativos o cero en denominaciones activas
  const invalidDenominations = denominations.filter(den => 
    (den.value > 0 && den.count <= 0) || (den.value <= 0 && den.count > 0)
  );
  
  if (invalidDenominations.length > 0) {
    errors.push('Todas las denominaciones deben tener un valor y cantidad mayor a cero.');
  }

  // Validar que el monto calculado coincida exactamente con el esperado
  const tolerance = 0.01; // Tolerancia para errores de redondeo
  if (Math.abs(calculatedAmount - expectedAmount) > tolerance) {
    errors.push(
      `Las denominaciones no coinciden con el monto indicado. ` +
      `Calculado: ${currency} ${calculatedAmount.toFixed(2)}, ` +
      `Esperado: ${currency} ${expectedAmount.toFixed(2)}`
    );
  }

  // Validar que el monto esperado sea mayor que cero
  if (expectedAmount <= 0) {
    errors.push('El monto de la transacción debe ser mayor a cero.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    calculatedAmount,
    expectedAmount
  };
}

/**
 * Valida que todas las denominaciones activas tienen valores válidos
 * @param denominations Array de denominaciones
 * @returns Lista de errores de validación
 */
export function validateDenominationFields(denominations: Denomination[]): string[] {
  const errors: string[] = [];
  
  denominations.forEach((den, index) => {
    // Si tiene valor pero no cantidad
    if (den.value > 0 && den.count <= 0) {
      errors.push(`La denominación ${index + 1} tiene valor pero no tiene cantidad.`);
    }
    
    // Si tiene cantidad pero no valor
    if (den.count > 0 && den.value <= 0) {
      errors.push(`La denominación ${index + 1} tiene cantidad pero no tiene valor.`);
    }
    
    // Validar que los valores sean números enteros positivos para las cantidades
    if (den.count > 0 && !Number.isInteger(den.count)) {
      errors.push(`La cantidad de la denominación ${index + 1} debe ser un número entero.`);
    }
    
    // Validar que los valores sean positivos
    if (den.value < 0) {
      errors.push(`El valor de la denominación ${index + 1} no puede ser negativo.`);
    }
    
    if (den.count < 0) {
      errors.push(`La cantidad de la denominación ${index + 1} no puede ser negativa.`);
    }
  });
  
  return errors;
}

/**
 * Verifica si se requiere validación de denominaciones basado en el contexto
 * @param paymentMethod Método de pago
 * @param currency Moneda
 * @returns true si se requiere validación de denominaciones
 */
export function requiresDenominationValidation(paymentMethod: string, currency: string): boolean {
  return paymentMethod === 'cash' && ['USD', 'EUR'].includes(currency);
}

/**
 * Formatea errores de validación para mostrar al usuario
 * @param errors Array de errores
 * @returns String formateado para mostrar
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
}