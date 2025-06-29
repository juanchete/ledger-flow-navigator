-- Migración para cambiar el tipo "banking" por "cash"
-- Fecha: 2025-01-16

BEGIN;

-- 1. Actualizar todas las transacciones existentes que tengan type = 'banking' a 'cash'
UPDATE transactions 
SET type = 'cash' 
WHERE type = 'banking';

-- 2. Actualizar la restricción CHECK en la tabla transactions
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('purchase', 'sale', 'cash', 'balance-change', 'expense', 'payment'));

-- 3. Actualizar cualquier evento de calendario que tenga category = 'banking' a 'cash'
UPDATE calendar_events 
SET category = 'cash' 
WHERE category = 'banking';

-- 4. Actualizar la restricción CHECK en la tabla calendar_events si existe
ALTER TABLE calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_category_check;

ALTER TABLE calendar_events 
ADD CONSTRAINT calendar_events_category_check 
CHECK (category IN ('legal', 'cash', 'home', 'social', 'charity', 'other', 'meeting', 'deadline', 'reminder'));

-- 5. Actualizar cualquier auditoría que pueda tener type = 'banking'
UPDATE transactions_audit 
SET type = 'cash' 
WHERE type = 'banking';

-- 6. Agregar comentario para documentar el cambio
COMMENT ON COLUMN transactions.type IS 
'Tipo de transacción: purchase (compra), sale (venta), cash (efectivo), balance-change (cambio de saldo), expense (gasto), payment (pago). Anteriormente "banking" se cambió a "cash".';

COMMIT; 