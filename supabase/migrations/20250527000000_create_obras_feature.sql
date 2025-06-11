-- Create Obras table
CREATE TABLE obras (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'obra_' || substr(md5(random()::text), 0, 9),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(32) CHECK (status IN ('planning', 'in-progress', 'completed', 'on-hold')),
    budget DECIMAL(18, 2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create GastoObras table
CREATE TABLE gasto_obras (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'gasto_' || substr(md5(random()::text), 0, 9),
    obra_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    date TIMESTAMP NOT NULL,
    receipt_url VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE CASCADE
);

-- Add obra_id to receivables
ALTER TABLE receivables ADD COLUMN obra_id VARCHAR(64);
ALTER TABLE receivables ADD CONSTRAINT fk_receivables_obra_id FOREIGN KEY (obra_id) REFERENCES obras(id);

-- Add obra_id to transactions
ALTER TABLE transactions ADD COLUMN obra_id VARCHAR(64);
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_obra_id FOREIGN KEY (obra_id) REFERENCES obras(id);

-- Add obra_id to audit tables
ALTER TABLE receivables_audit ADD COLUMN obra_id VARCHAR(64);
ALTER TABLE transactions_audit ADD COLUMN obra_id VARCHAR(64);

-- Add indexes for obra_id
CREATE INDEX idx_receivables_obra_id ON receivables(obra_id);
CREATE INDEX idx_transactions_obra_id ON transactions(obra_id);
CREATE INDEX idx_gasto_obras_obra_id ON gasto_obras(obra_id); 