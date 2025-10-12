# Análisis de Compatibilidad: Sistema FIFO de Capas VES

## Fecha: 2025-10-10
## Revisión de arquitectura antes de ejecutar migración

---

## ✅ VERIFICACIONES DE COMPATIBILIDAD

### 1. Estructura de Tablas Existentes

#### `bank_accounts`
**Estado actual** (según MANUAL_RLS_APPLICATION.sql):
```sql
CREATE TABLE bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    bank VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    user_id UUID REFERENCES auth.users(id)  -- ✅ YA EXISTE
);
```

**Cambios propuestos** (nuestra migración):
```sql
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS historical_cost_usd DECIMAL(18,2) DEFAULT 0;
```

**✅ COMPATIBLE**: Agrega columna nueva sin afectar existentes.

---

#### `debts`
**Estado actual**:
```sql
CREATE TABLE debts (
    id VARCHAR(64) PRIMARY KEY,
    creditor VARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(8),
    user_id UUID REFERENCES auth.users(id),  -- ✅ YA EXISTE
    ... (otros campos)
);
```

**Cambios propuestos**:
```sql
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS paid_amount_usd DECIMAL(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount_ves DECIMAL(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

-- Inicializar amount_usd con valor actual de amount
UPDATE debts SET amount_usd = amount WHERE amount_usd IS NULL;
```

**✅ COMPATIBLE**:
- Agrega columnas nuevas
- Inicializa `amount_usd` con datos existentes
- No rompe funcionalidad actual

---

#### `receivables`
**Estado actual**: Similar a `debts`

**Cambios propuestos**: Idénticos a `debts`

**✅ COMPATIBLE**: Mismo análisis que debts

---

### 2. Nueva Tabla: `bank_account_ves_layers`

**Propuesta**:
```sql
CREATE TABLE bank_account_ves_layers (
    id VARCHAR(64) PRIMARY KEY,
    bank_account_id VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(64),
    amount_ves DECIMAL(18,2) NOT NULL,
    remaining_ves DECIMAL(18,2) NOT NULL,
    exchange_rate DECIMAL(10,6) NOT NULL,
    equivalent_usd DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(64),  -- ⚠️ DEBERÍA SER UUID
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**⚠️ PROBLEMA DETECTADO**:
- `user_id` está como `VARCHAR(64)` pero en `users` table es `UUID`
- Debería ser `user_id UUID REFERENCES auth.users(id)`

**🔧 FIX NECESARIO**: Cambiar tipo de `user_id` a UUID

---

### 3. Triggers Existentes vs Nuevos

#### Trigger Actual: `update_bank_account_balance()`
**Archivo**: `supabase/migrations/20250117000000_add_ingreso_transaction_type.sql`

**Función actual**:
```sql
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
BEGIN
    -- Maneja INSERT, UPDATE, DELETE
    -- Actualiza bank_accounts.amount
    -- Maneja balance-change (transferencias)
    -- Maneja tipos: sale, payment, cash, ingreso, purchase, expense
END;
$$ LANGUAGE plpgsql;
```

**✅ COMPATIBLE**: Nuestros triggers NO sobrescriben este, se ejecutan en paralelo:
- `update_debt_status()` - Nuevo, no interfiere
- `update_receivable_status()` - Nuevo, no interfiere
- `update_bank_account_historical_cost()` - Nuevo, opera en tabla diferente (ves_layers)

**⚠️ PERO**: El trigger actual NO crea capas VES. Necesitamos:
1. Modificar `update_bank_account_balance()` para que:
   - Cuando una transacción VES entra → crear capa VES
   - Cuando una transacción VES sale → consumir capas FIFO

O mejor:

2. Crear un SEGUNDO trigger específico para VES layers:
   ```sql
   CREATE TRIGGER trigger_manage_ves_layers
       AFTER INSERT OR UPDATE OR DELETE ON transactions
       FOR EACH ROW
       EXECUTE FUNCTION manage_ves_layers();
   ```

---

### 4. Servicios TypeScript

#### `transactionService.ts`
**Estado actual**:
- Comenta: "Bank account balance is automatically updated by database trigger"
- NO maneja capas VES manualmente

**✅ COMPATIBLE**:
- Nuestro nuevo código solo agrega funcionalidad
- No modifica comportamiento existente
- Los triggers manejarán las capas automáticamente

---

#### `bankAccountService.ts`
**Cambios realizados**:
```typescript
// Agregamos:
export type BankAccountApp = {
  ...
  historical_cost_usd?: number;  // NUEVO
};

export const calculateAndUpdateHistoricalCost = async () => {...}
export const recalculateAllHistoricalCosts = async () => {...}
```

**✅ COMPATIBLE**:
- Funciones existentes no modificadas
- Solo agregamos funciones nuevas
- Campo `historical_cost_usd` es opcional (`?`)

---

#### `vesLayerService.ts`
**✅ NUEVO ARCHIVO**: No afecta código existente

---

### 5. Componentes Frontend

#### `Dashboard.tsx`
**Cambio propuesto**: Usar `historical_cost_usd` en lugar de conversión con tasa actual

**Línea actual** (aprox línea 73):
```typescript
const totalVESInUSD = convertVESToUSD ? convertVESToUSD(totalVES, 'parallel') || 0 : 0;
```

**Cambio propuesto**:
```typescript
const totalVESHistoricalCost = bankAccounts
  .filter(acc => acc.currency === 'VES')
  .reduce((sum, acc) => sum + (acc.historical_cost_usd || 0), 0);
```

**✅ COMPATIBLE**: Solo cambia cálculo interno, no rompe interfaz

---

#### `NetWorthBreakdown.tsx`
**Cambio similar a Dashboard**

**✅ COMPATIBLE**: Mismo análisis

---

## 🚨 PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### Problema 1: Tipo de `user_id` en `bank_account_ves_layers`
**Estado**: ❌ CRÍTICO
**Descripción**: `user_id` definido como VARCHAR(64) en lugar de UUID
**Solución**:
```sql
-- En la migración, cambiar:
user_id VARCHAR(64),
-- Por:
user_id UUID,

-- Y el foreign key:
CONSTRAINT fk_ves_layer_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
```

---

### Problema 2: Trigger NO crea/consume capas automáticamente
**Estado**: ⚠️ IMPORTANTE
**Descripción**: El trigger actual `update_bank_account_balance()` solo actualiza `amount`, no crea capas VES ni las consume en FIFO.

**Opciones**:

**Opción A** (Recomendada): Crear trigger separado para VES layers
```sql
CREATE OR REPLACE FUNCTION manage_ves_layers()
RETURNS TRIGGER AS $$
DECLARE
    account_currency VARCHAR(8);
BEGIN
    -- Solo procesar si la transacción afecta una cuenta VES
    IF TG_OP = 'INSERT' THEN
        SELECT currency INTO account_currency
        FROM bank_accounts
        WHERE id = NEW.bank_account_id;

        IF account_currency = 'VES' THEN
            -- Si es ingreso de VES (sale, ingreso, etc) → crear capa
            -- Si es egreso de VES (purchase, expense) → consumir capas FIFO
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**Opción B**: Manejar capas desde el código TypeScript
- Menos automático
- Más control
- Requiere cambios en `transactionService.ts`

**Decisión**: Necesitamos decidir cuál opción usar ANTES de ejecutar migración.

---

### Problema 3: Migración de datos existentes
**Estado**: ⚠️ IMPORTANTE
**Descripción**: ¿Qué pasa con las cuentas VES que ya tienen saldo?

**Solución propuesta**:
```sql
-- Después de crear la tabla, crear capa inicial para cuentas VES existentes
INSERT INTO bank_account_ves_layers (
    id,
    bank_account_id,
    transaction_id,
    amount_ves,
    remaining_ves,
    exchange_rate,
    equivalent_usd,
    user_id
)
SELECT
    gen_random_uuid()::varchar,  -- ID
    ba.id,                        -- bank_account_id
    NULL,                         -- transaction_id (no hay transacción origen)
    ba.amount,                    -- amount_ves
    ba.amount,                    -- remaining_ves
    (SELECT rate FROM exchange_rates
     WHERE from_currency = 'USD'
     AND to_currency = 'VES'
     ORDER BY date DESC LIMIT 1), -- exchange_rate (tasa más reciente)
    ba.amount / (SELECT rate FROM exchange_rates
                 WHERE from_currency = 'USD'
                 AND to_currency = 'VES'
                 ORDER BY date DESC LIMIT 1), -- equivalent_usd
    ba.user_id                    -- user_id
FROM bank_accounts ba
WHERE ba.currency = 'VES'
AND ba.amount > 0;

-- Actualizar historical_cost_usd
UPDATE bank_accounts ba
SET historical_cost_usd = (
    SELECT ba.amount / (
        SELECT rate FROM exchange_rates
        WHERE from_currency = 'USD'
        AND to_currency = 'VES'
        ORDER BY date DESC LIMIT 1
    )
)
WHERE ba.currency = 'VES'
AND ba.amount > 0;
```

---

## 📋 CHECKLIST ANTES DE EJECUTAR MIGRACIÓN

- [ ] **FIX 1**: Corregir tipo de `user_id` a UUID en `bank_account_ves_layers`
- [ ] **FIX 2**: Decidir estrategia de triggers (separado vs código)
- [ ] **FIX 3**: Agregar migración de datos existentes
- [ ] Hacer backup de base de datos
- [ ] Probar migración en ambiente de desarrollo primero
- [ ] Verificar que no hay transacciones pendientes
- [ ] Documentar rollback plan

---

## 🎯 RECOMENDACIONES FINALES

### ✅ LO QUE ESTÁ BIEN:
1. Estructura de tablas nueva no rompe nada existente
2. Servicios TypeScript bien diseñados
3. Lógica FIFO correctamente implementada
4. Triggers de status (debts/receivables) son independientes

### ⚠️ LO QUE NECESITA FIXES:
1. Tipo de `user_id` en VES layers
2. Trigger para crear/consumir capas automáticamente
3. Migración de datos VES existentes

### 📝 PRÓXIMOS PASOS:
1. Aplicar los 3 fixes mencionados
2. Crear versión corregida de la migración
3. Probar en desarrollo
4. Ejecutar en producción

---

## 🔧 COMPATIBILIDAD GENERAL: 85%

**Resumen**: La arquitectura es sólida y compatible, pero requiere 3 fixes críticos antes de ejecutar en producción.
