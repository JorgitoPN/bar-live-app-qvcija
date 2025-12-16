
-- Create Stripe payment tables

-- Table for storing Stripe customer information
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stripe_customers_user_or_local CHECK (
    (user_id IS NOT NULL AND local_id IS NULL) OR 
    (user_id IS NULL AND local_id IS NOT NULL)
  )
);

-- Table for storing payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT REFERENCES stripe_customers(stripe_customer_id) ON DELETE SET NULL,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes_suscripcion(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes_suscripcion(id) ON DELETE SET NULL,
  
  -- Invoice details
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 21.00, -- IVA in Spain
  tax_amount DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_tax_id TEXT, -- NIF/CIF
  customer_address TEXT,
  customer_city TEXT,
  customer_postal_code TEXT,
  customer_country TEXT DEFAULT 'España',
  
  -- Company information (Barlive)
  company_name TEXT DEFAULT 'Barlive',
  company_tax_id TEXT,
  company_address TEXT,
  company_city TEXT,
  company_postal_code TEXT,
  company_country TEXT DEFAULT 'España',
  
  -- Invoice status
  status TEXT DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- PDF storage
  pdf_url TEXT,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Barlive company fiscal data
CREATE TABLE IF NOT EXISTS company_fiscal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Barlive',
  tax_id TEXT NOT NULL, -- CIF
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'España',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  
  -- Bank details for invoices
  bank_name TEXT,
  iban TEXT,
  swift_bic TEXT,
  
  -- Invoice settings
  invoice_prefix TEXT DEFAULT 'BL',
  next_invoice_number INTEGER DEFAULT 1,
  invoice_footer_text TEXT,
  
  -- Email settings
  send_invoices_automatically BOOLEAN DEFAULT true,
  accounting_email TEXT, -- Email for sending invoices to accounting
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default company fiscal data
INSERT INTO company_fiscal_data (
  company_name,
  tax_id,
  address,
  city,
  postal_code,
  country,
  email,
  invoice_footer_text
) VALUES (
  'Barlive',
  'B12345678', -- Replace with actual CIF
  'Calle Ejemplo, 123',
  'Madrid',
  '28001',
  'España',
  'facturacion@barlive.app',
  'Gracias por confiar en Barlive. Para cualquier consulta, contacte con nosotros en soporte@barlive.app'
) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_fiscal_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
CREATE POLICY "Users can view their own Stripe customer data"
  ON stripe_customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all Stripe customers"
  ON stripe_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their own transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stripe_customers
      WHERE stripe_customers.stripe_customer_id = payment_transactions.stripe_customer_id
      AND stripe_customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Admins can insert transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM locales
      WHERE locales.id = invoices.local_id
      AND locales.propietario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- RLS Policies for company_fiscal_data
CREATE POLICY "Admins can view company fiscal data"
  ON company_fiscal_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Admins can update company fiscal data"
  ON company_fiscal_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_local_id ON stripe_customers(local_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id ON payment_transactions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_local_id ON payment_transactions(local_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_local_id ON invoices(local_id);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON invoices(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  fiscal_data RECORD;
  new_number INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get company fiscal data
  SELECT * INTO fiscal_data FROM company_fiscal_data LIMIT 1;
  
  -- Get next invoice number and increment
  new_number := fiscal_data.next_invoice_number;
  
  -- Update next invoice number
  UPDATE company_fiscal_data 
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = fiscal_data.id;
  
  -- Generate invoice number with format: PREFIX-YEAR-NUMBER
  invoice_num := fiscal_data.invoice_prefix || '-' || 
                 TO_CHAR(NOW(), 'YYYY') || '-' || 
                 LPAD(new_number::TEXT, 6, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate Spanish taxes (IVA)
CREATE OR REPLACE FUNCTION calculate_spanish_tax(subtotal DECIMAL)
RETURNS TABLE(tax_rate DECIMAL, tax_amount DECIMAL, total DECIMAL) AS $$
BEGIN
  -- Standard IVA rate in Spain is 21%
  RETURN QUERY SELECT 
    21.00::DECIMAL as tax_rate,
    ROUND(subtotal * 0.21, 2)::DECIMAL as tax_amount,
    ROUND(subtotal * 1.21, 2)::DECIMAL as total;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_fiscal_data_updated_at
  BEFORE UPDATE ON company_fiscal_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
