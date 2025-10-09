# 🔧 Instrucciones para Arreglar el Cálculo de Patrimonio

## 🐛 Problema Identificado

El patrimonio muestra valores incorrectos (133 en lugar de 0) debido a **dos bugs en el sistema de triggers**:

### Bug #1: Migración reciente eliminó soporte para 'ingreso'
La migración `20250612000000_add_denominations_to_transactions.sql` sobrescribió el trigger y **eliminó el tipo 'ingreso'** que se había agregado en una migración anterior.

### Bug #2: Script reset_accounts.sql usa versión obsoleta
El script `reset_accounts.sql` recreaba el trigger usando la versión antigua del `db_schema.sql` que no tiene:
- ✗ Soporte para tipo `'ingreso'`
- ✗ Soporte para `destination_bank_account_id` (transferencias entre cuentas)

## ✅ Correcciones Aplicadas

He actualizado los siguientes archivos:

1. ✅ **resources/fix_trigger_add_ingreso_complete.sql** - Nuevo script de corrección
2. ✅ **resources/reset_accounts.sql** - Actualizado con versión correcta del trigger
3. ✅ **supabase/migrations/20250612000000_add_denominations_to_transactions.sql** - Corregido para incluir 'ingreso'

## 🚀 Pasos para Arreglar la Base de Datos

### Opción 1: Ejecutar el Script de Corrección (RECOMENDADO)

1. Abre Supabase SQL Editor
2. Ejecuta el siguiente script:

```sql
-- Ejecutar: resources/fix_trigger_add_ingreso_complete.sql
```

Este script:
- ✅ Actualiza la función `update_bank_account_balance()` para incluir soporte de 'ingreso'
- ✅ Mantiene el soporte para transferencias entre cuentas (`balance-change`)
- ✅ Verifica que el trigger esté activo

3. Verifica que el trigger se actualizó correctamente:

```sql
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_update_bank_account_balance';
```

Deberías ver:
```
trigger_name                        | table_name   | enabled
------------------------------------|--------------|--------
trigger_update_bank_account_balance | transactions | O
```

(La 'O' significa que está habilitado)

### Opción 2: Reset Completo (Si quieres empezar de cero)

Si prefieres resetear todo nuevamente:

1. Abre Supabase SQL Editor
2. Ejecuta el script actualizado:

```sql
-- Ejecutar: resources/reset_accounts.sql
```

**ADVERTENCIA**: Esto eliminará TODAS las transacciones, deudas, cuentas por cobrar y reseteará los balances a cero.

El script ahora usa la versión correcta del trigger que incluye:
- ✅ Soporte para 'ingreso'
- ✅ Soporte para transferencias entre cuentas
- ✅ Todos los tipos de transacciones funcionando correctamente

## 🔍 Verificación

Después de ejecutar el script de corrección, verifica que todo funcione:

### 1. Verifica el trigger

```sql
-- Ver la definición del trigger
SELECT pg_get_functiondef('update_bank_account_balance'::regproc);
```

Deberías ver `'ingreso'` incluido en los CASE statements.

### 2. Prueba una transacción

Crea una transacción de prueba:
- Tipo: sale, ingreso, o payment
- Monto: 100
- Cuenta bancaria: cualquiera

El balance de la cuenta debería aumentar correctamente.

### 3. Verifica el patrimonio

El Dashboard debería calcular correctamente:
- Total USD: suma de todas las cuentas USD
- Total VES: suma de todas las cuentas VES
- Patrimonio Neto: Total USD + (Total VES / Tasa Paralela)

## 🎯 Causa Raíz del Problema

Tu transacción de "venta de 20k USD en bolívares" probablemente usó el tipo 'sale' o 'ingreso', pero:

1. Cuando ejecutaste `reset_accounts.sql`, el trigger se recreó sin soporte para 'ingreso'
2. La migración más reciente tampoco tenía 'ingreso'
3. El trigger no procesó correctamente la transacción
4. El balance quedó desincronizado

## 📋 Tipos de Transacciones Soportados

Después de la corrección, estos tipos funcionan correctamente:

### Incrementan el balance (+)
- `sale` - Ventas
- `payment` - Pagos recibidos
- `cash` - Movimientos de efectivo (ingresos)
- `ingreso` - Ingresos directos

### Decrementan el balance (-)
- `purchase` - Compras
- `expense` - Gastos

### Especial
- `balance-change` - Transferencias entre tus propias cuentas (no afecta el patrimonio total)

## 💡 Recomendaciones Futuras

1. **Antes de ejecutar reset_accounts.sql**: Siempre verifica que use la última versión del trigger
2. **Al crear migraciones**: Asegúrate de incluir TODOS los tipos de transacciones en el trigger
3. **Testing**: Después de un reset, prueba crear una transacción de cada tipo para verificar que funcionen

## 🆘 Si Sigues Teniendo Problemas

Si después de ejecutar el script de corrección sigues viendo valores incorrectos:

1. Ejecuta este query para ver todas tus transacciones:

```sql
SELECT
    id,
    type,
    amount,
    currency,
    bank_account_id,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

2. Verifica los balances de tus cuentas:

```sql
SELECT
    id,
    bank,
    account_number,
    amount,
    currency
FROM bank_accounts;
```

3. Compara con las transacciones para verificar que los balances sean correctos

4. Si hay discrepancias, puede que necesites recalcular manualmente los balances

---

**Archivo creado por**: Claude Code
**Fecha**: 2025-01-29
**Versión del trigger corregida**: Incluye 'ingreso' y 'balance-change' con destination_bank_account_id
