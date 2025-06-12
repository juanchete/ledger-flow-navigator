-- Esquema de base de datos para Ledger Flow Navigator
-- Incluye soporte para deudas, cuentas por cobrar, comisiones, intereses y tasas de cambio

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    contact_person VARCHAR(255),
    category VARCHAR(64),
    client_type VARCHAR(32) CHECK (client_type IN ('individual', 'company')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    identification_type VARCHAR(32),
    identification_number VARCHAR(64),
    identification_file_url VARCHAR(255),
    alert_status VARCHAR(16) CHECK (alert_status IN ('green', 'yellow', 'red')),
    alert_note TEXT,
    related_to_client_id VARCHAR(64),
    FOREIGN KEY (related_to_client_id) REFERENCES clients(id)
);

-- Bank accounts table
CREATE TABLE bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    bank VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD'
);

-- Exchange rates table
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(8) NOT NULL,
    to_currency VARCHAR(8) NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    date DATE NOT NULL
);

-- Debts table
CREATE TABLE debts (
    id VARCHAR(64) PRIMARY KEY,
    creditor VARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(16) CHECK (status IN ('pending', 'paid', 'overdue')),
    category VARCHAR(64),
    notes TEXT,
    client_id VARCHAR(64),
    interest_rate DECIMAL(6,3),
    commission DECIMAL(18,2),
    currency VARCHAR(8),
    installments INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Receivables table
CREATE TABLE receivables (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(16) CHECK (status IN ('pending', 'paid', 'overdue')),
    description TEXT,
    notes TEXT,
    interest_rate DECIMAL(6,3),
    commission DECIMAL(18,2),
    currency VARCHAR(8),
    installments INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE transactions (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) CHECK (type IN ('purchase', 'sale', 'banking', 'balance-change', 'expense', 'payment')),
    amount DECIMAL(18,2) NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    client_id VARCHAR(64),
    status VARCHAR(16) CHECK (status IN ('pending', 'completed', 'cancelled')),
    receipt VARCHAR(255),
    invoice VARCHAR(255),
    delivery_note VARCHAR(255),
    payment_method VARCHAR(64),
    category VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    indirect_for_client_id VARCHAR(64),
    debt_id VARCHAR(64),
    receivable_id VARCHAR(64),
    exchange_rate_id INTEGER,
    currency VARCHAR(8),
    bank_account_id VARCHAR(64),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (indirect_for_client_id) REFERENCES clients(id),
    FOREIGN KEY (debt_id) REFERENCES debts(id),
    FOREIGN KEY (receivable_id) REFERENCES receivables(id),
    FOREIGN KEY (exchange_rate_id) REFERENCES exchange_rates(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- Documents table
CREATE TABLE documents (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    url VARCHAR(255) NOT NULL,
    size INTEGER,
    uploaded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Calendar events table
CREATE TABLE calendar_events (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    category VARCHAR(64),
    client_id VARCHAR(64),
    is_reminder BOOLEAN DEFAULT FALSE,
    reminder_days INTEGER,
    location VARCHAR(255),
    location_url VARCHAR(255),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    client_id VARCHAR(64),
    type VARCHAR(32),
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Financial stats table (for dashboard)
CREATE TABLE financial_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    net_worth DECIMAL(18,2) NOT NULL,
    receivables DECIMAL(18,2) NOT NULL,
    debts DECIMAL(18,2) NOT NULL,
    expenses DECIMAL(18,2) NOT NULL
);

-- Expense stats table (for charts)
CREATE TABLE expense_stats (
    id SERIAL PRIMARY KEY,
    category VARCHAR(64) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    color VARCHAR(7) NOT NULL
);

-- Audit tables for tracking changes
CREATE TABLE debts_audit (
    audit_id SERIAL PRIMARY KEY,
    debt_id VARCHAR(64),
    action VARCHAR(16),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP DEFAULT NOW(),
    creditor VARCHAR(255),
    amount DECIMAL(18,2),
    due_date TIMESTAMP,
    status VARCHAR(16),
    category VARCHAR(64),
    notes TEXT,
    client_id VARCHAR(64),
    interest_rate DECIMAL(6,3),
    commission DECIMAL(18,2),
    currency VARCHAR(8),
    installments INTEGER
);

CREATE TABLE receivables_audit (
    audit_id SERIAL PRIMARY KEY,
    receivable_id VARCHAR(64),
    action VARCHAR(16),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP DEFAULT NOW(),
    client_id VARCHAR(64),
    amount DECIMAL(18,2),
    due_date TIMESTAMP,
    status VARCHAR(16),
    description TEXT,
    notes TEXT,
    interest_rate DECIMAL(6,3),
    commission DECIMAL(18,2),
    currency VARCHAR(8),
    installments INTEGER
);

CREATE TABLE transactions_audit (
    audit_id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(64),
    action VARCHAR(16),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP DEFAULT NOW(),
    type VARCHAR(32),
    amount DECIMAL(18,2),
    description TEXT,
    date TIMESTAMP,
    client_id VARCHAR(64),
    status VARCHAR(16),
    receipt VARCHAR(255),
    invoice VARCHAR(255),
    delivery_note VARCHAR(255),
    payment_method VARCHAR(64),
    category VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    indirect_for_client_id VARCHAR(64),
    debt_id VARCHAR(64),
    receivable_id VARCHAR(64),
    exchange_rate_id INTEGER,
    currency VARCHAR(8)
);

CREATE TABLE notifications_audit (
    audit_id SERIAL PRIMARY KEY,
    notification_id INTEGER,
    action VARCHAR(16),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(64),
    client_id VARCHAR(64),
    type VARCHAR(32),
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN,
    created_at TIMESTAMP
);

-- Function to update bank account balance based on transaction
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
BEGIN
    -- Handle INSERT (new transaction)
    IF TG_OP = 'INSERT' THEN
        IF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL THEN
            -- Determine balance change based on transaction type
            CASE NEW.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;
                WHEN 'balance-change' THEN
                    balance_change := NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            -- Update bank account balance
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (modified transaction)
    IF TG_OP = 'UPDATE' THEN
        -- Revert old transaction effect if it had a bank account
        IF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL THEN
            CASE OLD.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := -OLD.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := OLD.amount;
                WHEN 'balance-change' THEN
                    balance_change := -OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = OLD.bank_account_id;
        END IF;
        
        -- Apply new transaction effect if it has a bank account
        IF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL THEN
            CASE NEW.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;
                WHEN 'balance-change' THEN
                    balance_change := NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (removed transaction)
    IF TG_OP = 'DELETE' THEN
        IF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL THEN
            -- Revert the transaction effect
            CASE OLD.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := -OLD.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := OLD.amount;
                WHEN 'balance-change' THEN
                    balance_change := -OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = OLD.bank_account_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bank account balance updates
CREATE TRIGGER trigger_update_bank_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balance();

-- Indexes for better performance
CREATE INDEX idx_transactions_bank_account_id ON transactions(bank_account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_clients_active ON clients(active);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_receivables_status ON receivables(status);
CREATE INDEX idx_calendar_events_date ON calendar_events(start_date); 