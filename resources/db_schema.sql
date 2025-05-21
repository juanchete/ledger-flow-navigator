-- Esquema de base de datos para Ledger Flow Navigator
-- Incluye soporte para deudas, cuentas por cobrar, comisiones, intereses y tasas de cambio

CREATE TABLE clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    category VARCHAR(32) CHECK (category IN ('individual', 'company', 'non-profit', 'government')),
    client_type VARCHAR(16) CHECK (client_type IN ('direct', 'indirect')),
    identification_type VARCHAR(16),
    identification_number VARCHAR(64),
    identification_file_url VARCHAR(255),
    active BOOLEAN NOT NULL,
    address VARCHAR(255),
    contact_person VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    alert_status VARCHAR(16) CHECK (alert_status IN ('none', 'yellow', 'red')),
    alert_note TEXT,
    related_to_client_id VARCHAR(64),
    FOREIGN KEY (related_to_client_id) REFERENCES clients(id)
);

CREATE TABLE documents (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    size INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

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
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

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

CREATE TABLE calendar_events (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    category VARCHAR(32) CHECK (category IN ('legal', 'banking', 'home', 'social', 'charity', 'other', 'meeting', 'deadline', 'reminder')),
    client_id VARCHAR(64),
    is_reminder BOOLEAN NOT NULL,
    completed BOOLEAN NOT NULL,
    reminder_days INTEGER,
    location VARCHAR(255),
    location_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    bank VARCHAR(255) NOT NULL,
    account_number VARCHAR(64) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(8) NOT NULL
);

CREATE TABLE financial_stats (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    net_worth DECIMAL(18,2) NOT NULL,
    receivables DECIMAL(18,2) NOT NULL,
    debts DECIMAL(18,2) NOT NULL,
    expenses DECIMAL(18,2) NOT NULL
);

CREATE TABLE expense_stats (
    id SERIAL PRIMARY KEY,
    category VARCHAR(64) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    percentage DECIMAL(6,2) NOT NULL,
    color VARCHAR(16) NOT NULL
);

CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    from_currency VARCHAR(8) NOT NULL,
    to_currency VARCHAR(8) NOT NULL,
    rate DECIMAL(18,6) NOT NULL
);

-- Tabla de usuarios (integración con Supabase Auth, solo info adicional y roles)
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY, -- Debe coincidir con el user id de Supabase Auth
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(255),
    role VARCHAR(32) DEFAULT 'user', -- Ejemplo: 'admin', 'user', 'auditor', etc.
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64), -- FK a users.id
    client_id VARCHAR(64), -- FK a clients.id (opcional)
    type VARCHAR(32), -- Ejemplo: 'alert', 'reminder', 'info'
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Tabla de auditoría para deudas
CREATE TABLE debts_audit (
    audit_id SERIAL PRIMARY KEY,
    debt_id VARCHAR(64),
    action VARCHAR(16) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by VARCHAR(64), -- user_id de la tabla users
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    creditor VARCHAR(255),
    amount DECIMAL(18,2),
    due_date TIMESTAMP,
    status VARCHAR(16),
    category VARCHAR(64),
    notes TEXT,
    client_id VARCHAR(64),
    interest_rate DECIMAL(6,3),
    commission DECIMAL(18,2),
    currency VARCHAR(8)
);

-- Tabla de auditoría para cuentas por cobrar
CREATE TABLE receivables_audit (
    audit_id SERIAL PRIMARY KEY,
    receivable_id VARCHAR(64),
    action VARCHAR(16) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    client_id VARCHAR(64),
    amount DECIMAL(18,2),
    due_date TIMESTAMP,
    status VARCHAR(16),
    description TEXT,
    notes TEXT,
    interest_rate DECIMAL(6,3),
    commission DECIMAL(18,2),
    currency VARCHAR(8)
);

-- Tabla de auditoría para transacciones
CREATE TABLE transactions_audit (
    audit_id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(64),
    action VARCHAR(16) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
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

-- Tabla de auditoría para notificaciones
CREATE TABLE notifications_audit (
    audit_id SERIAL PRIMARY KEY,
    notification_id INTEGER,
    action VARCHAR(16) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id VARCHAR(64),
    client_id VARCHAR(64),
    type VARCHAR(32),
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN,
    created_at TIMESTAMP
); 