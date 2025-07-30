-- Script de creación de tablas de facturación compatible con tu estructura actual

-- Invoice Companies Table
CREATE TABLE invoice_companies (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('construction', 'electronics', 'papers', 'electricity')),
    legal_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Venezuela',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Invoice Templates Table
CREATE TABLE invoice_templates (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    template_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES invoice_companies(id) ON DELETE CASCADE
);

-- Invoice Items Catalog Table
CREATE TABLE invoice_items_catalog (
    id VARCHAR(64) PRIMARY KEY,
    company_type VARCHAR(50) NOT NULL CHECK (company_type IN ('construction', 'electronics', 'papers', 'electricity')),
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    min_price DECIMAL(18,2) NOT NULL,
    max_price DECIMAL(18,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generated Invoices Table
CREATE TABLE generated_invoices (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(64),
    company_id VARCHAR(64) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    client_id VARCHAR(64),
    client_name VARCHAR(255) NOT NULL,
    client_tax_id VARCHAR(50),
    client_address TEXT,
    client_phone VARCHAR(50),
    client_email VARCHAR(255),
    subtotal DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(18,4),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    notes TEXT,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES invoice_companies(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    UNIQUE(company_id, invoice_number)
);

-- Invoice Line Items Table
CREATE TABLE invoice_line_items (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL,
    item_catalog_id VARCHAR(64),
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    tax_amount DECIMAL(18,2) NOT NULL,
    total DECIMAL(18,2) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES generated_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_catalog_id) REFERENCES invoice_items_catalog(id) ON DELETE SET NULL
);

-- Invoice Number Sequences Table
CREATE TABLE invoice_sequences (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES invoice_companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, prefix, year)
);

-- Indexes for performance
CREATE INDEX idx_invoice_companies_user_id ON invoice_companies(user_id);
CREATE INDEX idx_invoice_companies_type ON invoice_companies(type);
CREATE INDEX idx_generated_invoices_user_id ON generated_invoices(user_id);
CREATE INDEX idx_generated_invoices_transaction_id ON generated_invoices(transaction_id);
CREATE INDEX idx_generated_invoices_company_id ON generated_invoices(company_id);
CREATE INDEX idx_generated_invoices_client_id ON generated_invoices(client_id);
CREATE INDEX idx_generated_invoices_invoice_date ON generated_invoices(invoice_date);
CREATE INDEX idx_generated_invoices_status ON generated_invoices(status);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_items_catalog_company_type ON invoice_items_catalog(company_type);
CREATE INDEX idx_invoice_sequences_company_id ON invoice_sequences(company_id);

-- Row Level Security Policies
ALTER TABLE invoice_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_companies
CREATE POLICY "Users can view their own invoice companies"
    ON invoice_companies FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can create their own invoice companies"
    ON invoice_companies FOR INSERT
    WITH CHECK (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can update their own invoice companies"
    ON invoice_companies FOR UPDATE
    USING (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can delete their own invoice companies"
    ON invoice_companies FOR DELETE
    USING (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

-- Policies for invoice_templates
CREATE POLICY "Users can view templates of their companies"
    ON invoice_templates FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM invoice_companies 
        WHERE invoice_companies.id = invoice_templates.company_id 
        AND invoice_companies.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can create templates for their companies"
    ON invoice_templates FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoice_companies 
        WHERE invoice_companies.id = invoice_templates.company_id 
        AND invoice_companies.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can update templates of their companies"
    ON invoice_templates FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM invoice_companies 
        WHERE invoice_companies.id = invoice_templates.company_id 
        AND invoice_companies.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can delete templates of their companies"
    ON invoice_templates FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM invoice_companies 
        WHERE invoice_companies.id = invoice_templates.company_id 
        AND invoice_companies.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

-- Policies for generated_invoices
CREATE POLICY "Users can view their own invoices"
    ON generated_invoices FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can create their own invoices"
    ON generated_invoices FOR INSERT
    WITH CHECK (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can update their own invoices"
    ON generated_invoices FOR UPDATE
    USING (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can delete their own invoices"
    ON generated_invoices FOR DELETE
    USING (user_id = (SELECT id FROM users WHERE id = auth.uid()::text));

-- Policies for invoice_line_items
CREATE POLICY "Users can view line items of their invoices"
    ON invoice_line_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM generated_invoices 
        WHERE generated_invoices.id = invoice_line_items.invoice_id 
        AND generated_invoices.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can create line items for their invoices"
    ON invoice_line_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM generated_invoices 
        WHERE generated_invoices.id = invoice_line_items.invoice_id 
        AND generated_invoices.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can update line items of their invoices"
    ON invoice_line_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM generated_invoices 
        WHERE generated_invoices.id = invoice_line_items.invoice_id 
        AND generated_invoices.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

CREATE POLICY "Users can delete line items of their invoices"
    ON invoice_line_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM generated_invoices 
        WHERE generated_invoices.id = invoice_line_items.invoice_id 
        AND generated_invoices.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

-- Policies for invoice_sequences
CREATE POLICY "Users can view sequences of their companies"
    ON invoice_sequences FOR ALL
    USING (EXISTS (
        SELECT 1 FROM invoice_companies 
        WHERE invoice_companies.id = invoice_sequences.company_id 
        AND invoice_companies.user_id = (SELECT id FROM users WHERE id = auth.uid()::text)
    ));

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_company_id VARCHAR, p_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_current_year INTEGER;
    v_next_number INTEGER;
    v_invoice_number VARCHAR;
BEGIN
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get or create sequence for current year
    INSERT INTO invoice_sequences (company_id, prefix, current_number, year)
    VALUES (p_company_id, p_prefix, 0, v_current_year)
    ON CONFLICT (company_id, prefix, year) 
    DO UPDATE SET 
        current_number = invoice_sequences.current_number + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING current_number + 1 INTO v_next_number;
    
    -- Format invoice number: PREFIX-YYYY-00001
    v_invoice_number := p_prefix || '-' || v_current_year || '-' || LPAD(v_next_number::TEXT, 5, '0');
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_invoice_companies_updated_at
    BEFORE UPDATE ON invoice_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER update_invoice_templates_updated_at
    BEFORE UPDATE ON invoice_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER update_generated_invoices_updated_at
    BEFORE UPDATE ON generated_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER update_invoice_sequences_updated_at
    BEFORE UPDATE ON invoice_sequences
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();