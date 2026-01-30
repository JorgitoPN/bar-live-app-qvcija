
-- ============================================================================
-- STRIPE SUBSCRIPTION SYSTEM - COMPLETE IMPLEMENTATION
-- ============================================================================
-- This migration creates a complete Stripe-based subscription system for venue owners
-- with trial periods, payment methods, webhooks, and lifecycle management.
-- ============================================================================

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE (Enhanced)
-- ============================================================================
-- Add new columns to existing planes_suscripcion table
ALTER TABLE planes_suscripcion
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS duracion_meses INTEGER DEFAULT 1 CHECK (duracion_meses > 0),
ADD COLUMN IF NOT EXISTS orden_visualizacion INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recomendado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_habilitado BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS trial_dias INTEGER DEFAULT 30 CHECK (trial_dias >= 0),
ADD COLUMN IF NOT EXISTS caracteristicas_detalladas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN planes_suscripcion.stripe_product_id IS 'Stripe Product ID for this plan';
COMMENT ON COLUMN planes_suscripcion.stripe_price_id IS 'Stripe Price ID for recurring billing';
COMMENT ON COLUMN planes_suscripcion.duracion_meses IS 'Plan duration in months (1 = monthly, 12 = yearly)';
COMMENT ON COLUMN planes_suscripcion.orden_visualizacion IS 'Display order in plan selection UI (lower = first)';
COMMENT ON COLUMN planes_suscripcion.recomendado IS 'Whether this plan is marked as recommended';
COMMENT ON COLUMN planes_suscripcion.trial_habilitado IS 'Whether free trial is enabled for this plan';
COMMENT ON COLUMN planes_suscripcion.trial_dias IS 'Number of days for free trial (default 30)';
COMMENT ON COLUMN planes_suscripcion.caracteristicas_detalladas IS 'Detailed feature list for marketing display';

-- ============================================================================
-- 2. STRIPE CUSTOMERS TABLE (Enhanced)
-- ============================================================================
ALTER TABLE stripe_customers
ADD COLUMN IF NOT EXISTS default_payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN stripe_customers.default_payment_method IS 'Stripe Payment Method ID (default card)';
COMMENT ON COLUMN stripe_customers.payment_methods IS 'Array of all saved payment methods';

-- ============================================================================
-- 3. STRIPE SUBSCRIPTIONS TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe IDs
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(stripe_customer_id) ON DELETE CASCADE,
  stripe_price_id TEXT NOT NULL,
  
  -- Relationships
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES planes_suscripcion(id) ON DELETE RESTRICT,
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Subscription Status
  estado TEXT NOT NULL DEFAULT 'incomplete' CHECK (estado IN (
    'incomplete',           -- Payment method not yet added
    'incomplete_expired',   -- Setup expired without payment
    'trialing',            -- In free trial period
    'active',              -- Active and paid
    'past_due',            -- Payment failed, retrying
    'canceled',            -- Canceled by user
    'unpaid'               -- Payment failed after retries
  )),
  
  -- Dates
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Billing
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  default_payment_method TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_subscriptions_local ON stripe_subscriptions(local_id);
CREATE INDEX idx_stripe_subscriptions_propietario ON stripe_subscriptions(propietario_id);
CREATE INDEX idx_stripe_subscriptions_estado ON stripe_subscriptions(estado);
CREATE INDEX idx_stripe_subscriptions_stripe_id ON stripe_subscriptions(stripe_subscription_id);

COMMENT ON TABLE stripe_subscriptions IS 'Stripe subscription records with full lifecycle management';
COMMENT ON COLUMN stripe_subscriptions.estado IS 'Subscription status: incomplete, trialing, active, past_due, canceled, unpaid';
COMMENT ON COLUMN stripe_subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';

-- ============================================================================
-- 4. STRIPE SETUP INTENTS TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_setup_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe IDs
  stripe_setup_intent_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(stripe_customer_id) ON DELETE CASCADE,
  
  -- Relationships
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes_suscripcion(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'requires_payment_method' CHECK (status IN (
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'succeeded',
    'canceled'
  )),
  
  -- Payment Method
  payment_method TEXT,
  
  -- Metadata
  client_secret TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_setup_intents_propietario ON stripe_setup_intents(propietario_id);
CREATE INDEX idx_stripe_setup_intents_status ON stripe_setup_intents(status);

COMMENT ON TABLE stripe_setup_intents IS 'Stripe SetupIntents for collecting payment methods before trial activation';

-- ============================================================================
-- 5. STRIPE INVOICES TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe IDs
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT REFERENCES stripe_subscriptions(stripe_subscription_id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(stripe_customer_id) ON DELETE CASCADE,
  
  -- Relationships
  local_id UUID REFERENCES locales(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES planes_suscripcion(id) ON DELETE SET NULL,
  
  -- Invoice Details
  invoice_number TEXT,
  amount_due NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'open',
    'paid',
    'void',
    'uncollectible'
  )),
  
  -- Dates
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- URLs
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_invoices_subscription ON stripe_invoices(stripe_subscription_id);
CREATE INDEX idx_stripe_invoices_local ON stripe_invoices(local_id);
CREATE INDEX idx_stripe_invoices_status ON stripe_invoices(status);

COMMENT ON TABLE stripe_invoices IS 'Stripe invoice records for subscription billing';

-- ============================================================================
-- 6. STRIPE WEBHOOK EVENTS TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe Event
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  last_processing_error TEXT,
  
  -- Data
  event_data JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX idx_stripe_webhook_events_created ON stripe_webhook_events(created_at);

COMMENT ON TABLE stripe_webhook_events IS 'Stores all Stripe webhook events for processing and audit';

-- ============================================================================
-- 7. SUBSCRIPTION EMAIL NOTIFICATIONS TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  subscription_id UUID REFERENCES stripe_subscriptions(id) ON DELETE CASCADE,
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Email Details
  tipo TEXT NOT NULL CHECK (tipo IN (
    'trial_started',
    'trial_ending_7_days',
    'trial_ending_3_days',
    'trial_ending_1_day',
    'payment_succeeded',
    'payment_failed',
    'subscription_canceled',
    'subscription_reactivated'
  )),
  
  -- Status
  enviado BOOLEAN DEFAULT FALSE,
  error_envio TEXT,
  
  -- Timestamps
  programado_para TIMESTAMPTZ NOT NULL,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_emails_programado ON subscription_email_notifications(programado_para) WHERE NOT enviado;
CREATE INDEX idx_subscription_emails_subscription ON subscription_email_notifications(subscription_id);

COMMENT ON TABLE subscription_email_notifications IS 'Scheduled email notifications for subscription lifecycle events';

-- ============================================================================
-- 8. PAYMENT FAILURE TRACKING TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_failure_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  subscription_id UUID NOT NULL REFERENCES stripe_subscriptions(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES stripe_invoices(id) ON DELETE SET NULL,
  
  -- Failure Details
  attempt_number INTEGER NOT NULL DEFAULT 1,
  failure_reason TEXT,
  failure_code TEXT,
  
  -- Actions Taken
  notification_sent BOOLEAN DEFAULT FALSE,
  features_restricted BOOLEAN DEFAULT FALSE,
  profile_hidden BOOLEAN DEFAULT FALSE,
  
  -- Next Retry
  next_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_failures_subscription ON payment_failure_tracking(subscription_id);
CREATE INDEX idx_payment_failures_next_retry ON payment_failure_tracking(next_retry_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE payment_failure_tracking IS 'Tracks payment failures and retry attempts';

-- ============================================================================
-- 9. SUBSCRIPTION TRIAL ACCEPTANCE TABLE (New)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_trial_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES planes_suscripcion(id) ON DELETE RESTRICT,
  
  -- Acceptance Details
  accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_auto_charge BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(propietario_id, local_id, plan_id)
);

CREATE INDEX idx_trial_acceptances_propietario ON subscription_trial_acceptances(propietario_id);

COMMENT ON TABLE subscription_trial_acceptances IS 'Records user acceptance of trial terms and auto-charge agreement';

-- ============================================================================
-- 10. SUBSCRIPTION COUPONS TABLE (New - Prepared for future)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe ID
  stripe_coupon_id TEXT UNIQUE NOT NULL,
  
  -- Coupon Details
  code TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  
  -- Discount
  tipo_descuento TEXT NOT NULL CHECK (tipo_descuento IN ('percentage', 'fixed_amount')),
  valor_descuento NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Restrictions
  duracion TEXT NOT NULL CHECK (duracion IN ('once', 'repeating', 'forever')),
  duracion_meses INTEGER,
  max_redemptions INTEGER,
  redemptions_count INTEGER DEFAULT 0,
  
  -- Validity
  activo BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Applicable Plans
  planes_aplicables UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_coupons_code ON subscription_coupons(code) WHERE activo = TRUE;
CREATE INDEX idx_subscription_coupons_valid ON subscription_coupons(valid_from, valid_until) WHERE activo = TRUE;

COMMENT ON TABLE subscription_coupons IS 'Promotional coupons for subscription discounts (prepared for future use)';

-- ============================================================================
-- 11. COUPON REDEMPTIONS TABLE (New - Prepared for future)
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  coupon_id UUID NOT NULL REFERENCES subscription_coupons(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES stripe_subscriptions(id) ON DELETE CASCADE,
  propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Redemption Details
  discount_applied NUMERIC(10, 2) NOT NULL,
  
  -- Timestamps
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(coupon_id, subscription_id)
);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_subscription ON coupon_redemptions(subscription_id);

COMMENT ON TABLE coupon_redemptions IS 'Tracks coupon usage per subscription';

-- ============================================================================
-- 12. UPDATE EXISTING SUSCRIPCIONES_LOCALES TABLE
-- ============================================================================
-- Add Stripe-related columns to existing subscription tracking table
ALTER TABLE suscripciones_locales
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS trial_activo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_fin TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dias_trial_restantes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method_saved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_charge_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_failed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_failure TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS features_restricted BOOLEAN DEFAULT FALSE;

-- Update estado check constraint to include new states
ALTER TABLE suscripciones_locales DROP CONSTRAINT IF EXISTS suscripciones_locales_estado_check;
ALTER TABLE suscripciones_locales ADD CONSTRAINT suscripciones_locales_estado_check 
  CHECK (estado IN ('activa', 'cancelada', 'pausada', 'expirada', 'trialing', 'past_due', 'incomplete', 'unpaid'));

COMMENT ON COLUMN suscripciones_locales.stripe_subscription_id IS 'Reference to Stripe subscription ID';
COMMENT ON COLUMN suscripciones_locales.trial_activo IS 'Whether subscription is currently in trial period';
COMMENT ON COLUMN suscripciones_locales.dias_trial_restantes IS 'Days remaining in trial period';
COMMENT ON COLUMN suscripciones_locales.payment_method_saved IS 'Whether valid payment method has been saved';
COMMENT ON COLUMN suscripciones_locales.auto_charge_accepted IS 'Whether user accepted automatic charge after trial';

-- ============================================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Stripe Subscriptions RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (propietario_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol_app = 'admin'
    )
  );

-- Stripe Setup Intents RLS
ALTER TABLE stripe_setup_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own setup intents"
  ON stripe_setup_intents FOR SELECT
  USING (propietario_id = auth.uid());

-- Stripe Invoices RLS
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON stripe_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stripe_subscriptions
      WHERE stripe_subscriptions.stripe_subscription_id = stripe_invoices.stripe_subscription_id
      AND stripe_subscriptions.propietario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoices"
  ON stripe_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol_app = 'admin'
    )
  );

-- Subscription Email Notifications RLS
ALTER TABLE subscription_email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email notifications"
  ON subscription_email_notifications FOR SELECT
  USING (propietario_id = auth.uid());

-- Trial Acceptances RLS
ALTER TABLE subscription_trial_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trial acceptances"
  ON subscription_trial_acceptances FOR SELECT
  USING (propietario_id = auth.uid());

CREATE POLICY "Users can insert their own trial acceptances"
  ON subscription_trial_acceptances FOR INSERT
  WITH CHECK (propietario_id = auth.uid());

-- Coupons RLS (Read-only for users, full access for admins)
ALTER TABLE subscription_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
  ON subscription_coupons FOR SELECT
  USING (activo = TRUE);

CREATE POLICY "Admins can manage coupons"
  ON subscription_coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol_app = 'admin'
    )
  );

-- ============================================================================
-- 14. FUNCTIONS FOR SUBSCRIPTION MANAGEMENT
-- ============================================================================

-- Function to calculate days remaining in trial
CREATE OR REPLACE FUNCTION calculate_trial_days_remaining(subscription_id UUID)
RETURNS INTEGER AS $$
DECLARE
  trial_end_date TIMESTAMPTZ;
  days_remaining INTEGER;
BEGIN
  SELECT trial_fin INTO trial_end_date
  FROM suscripciones_locales
  WHERE id = subscription_id;
  
  IF trial_end_date IS NULL THEN
    RETURN 0;
  END IF;
  
  days_remaining := EXTRACT(DAY FROM (trial_end_date - NOW()));
  
  RETURN GREATEST(0, days_remaining);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if subscription allows feature access
CREATE OR REPLACE FUNCTION can_access_feature(
  p_local_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_estado TEXT;
  plan_permisos JSONB;
BEGIN
  -- Get subscription status and plan permissions
  SELECT s.estado, p.permisos
  INTO subscription_estado, plan_permisos
  FROM suscripciones_locales s
  JOIN planes_suscripcion p ON s.plan_id = p.id
  WHERE s.local_id = p_local_id
  AND s.estado IN ('activa', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- No active subscription
  IF subscription_estado IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if feature is enabled in plan
  IF plan_permisos IS NOT NULL AND plan_permisos ? p_feature THEN
    RETURN (plan_permisos->>p_feature)::BOOLEAN;
  END IF;
  
  -- Default to false if feature not found
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription status from Stripe webhook
CREATE OR REPLACE FUNCTION sync_subscription_status(
  p_stripe_subscription_id TEXT,
  p_new_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_trial_start TIMESTAMPTZ DEFAULT NULL,
  p_trial_end TIMESTAMPTZ DEFAULT NULL,
  p_canceled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_subscription_id UUID;
  v_local_id UUID;
BEGIN
  -- Get subscription and local IDs
  SELECT id, local_id INTO v_subscription_id, v_local_id
  FROM stripe_subscriptions
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found: %', p_stripe_subscription_id;
  END IF;
  
  -- Update stripe_subscriptions table
  UPDATE stripe_subscriptions
  SET
    estado = p_new_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    trial_start = COALESCE(p_trial_start, trial_start),
    trial_end = COALESCE(p_trial_end, trial_end),
    canceled_at = COALESCE(p_canceled_at, canceled_at),
    updated_at = NOW()
  WHERE id = v_subscription_id;
  
  -- Update suscripciones_locales table
  UPDATE suscripciones_locales
  SET
    estado = CASE
      WHEN p_new_status = 'trialing' THEN 'trialing'
      WHEN p_new_status = 'active' THEN 'activa'
      WHEN p_new_status = 'past_due' THEN 'past_due'
      WHEN p_new_status = 'canceled' THEN 'cancelada'
      WHEN p_new_status = 'unpaid' THEN 'expirada'
      ELSE estado
    END,
    trial_activo = (p_new_status = 'trialing'),
    trial_inicio = COALESCE(p_trial_start, trial_inicio),
    trial_fin = COALESCE(p_trial_end, trial_fin),
    fecha_proximo_pago = p_current_period_end,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  -- Update local visibility based on subscription status
  IF p_new_status IN ('canceled', 'unpaid', 'incomplete_expired') THEN
    UPDATE locales
    SET perfil_visible = FALSE, activo = FALSE
    WHERE id = v_local_id;
  ELSIF p_new_status IN ('active', 'trialing') THEN
    UPDATE locales
    SET perfil_visible = TRUE, activo = TRUE
    WHERE id = v_local_id;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 15. TRIGGERS
-- ============================================================================

-- Trigger to update dias_trial_restantes automatically
CREATE OR REPLACE FUNCTION update_trial_days_remaining()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_activo = TRUE AND NEW.trial_fin IS NOT NULL THEN
    NEW.dias_trial_restantes := GREATEST(0, EXTRACT(DAY FROM (NEW.trial_fin - NOW()))::INTEGER);
  ELSE
    NEW.dias_trial_restantes := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trial_days
  BEFORE INSERT OR UPDATE ON suscripciones_locales
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_days_remaining();

-- Trigger to schedule email notifications when subscription changes
CREATE OR REPLACE FUNCTION schedule_subscription_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Trial started
  IF NEW.trial_activo = TRUE AND (OLD IS NULL OR OLD.trial_activo = FALSE) THEN
    INSERT INTO subscription_email_notifications (subscription_id, propietario_id, tipo, programado_para)
    VALUES (NEW.id, NEW.propietario_id, 'trial_started', NOW());
    
    -- Schedule trial ending reminders
    IF NEW.trial_fin IS NOT NULL THEN
      INSERT INTO subscription_email_notifications (subscription_id, propietario_id, tipo, programado_para)
      VALUES 
        (NEW.id, NEW.propietario_id, 'trial_ending_7_days', NEW.trial_fin - INTERVAL '7 days'),
        (NEW.id, NEW.propietario_id, 'trial_ending_3_days', NEW.trial_fin - INTERVAL '3 days'),
        (NEW.id, NEW.propietario_id, 'trial_ending_1_day', NEW.trial_fin - INTERVAL '1 day');
    END IF;
  END IF;
  
  -- Subscription canceled
  IF NEW.estado = 'cancelada' AND (OLD IS NULL OR OLD.estado != 'cancelada') THEN
    INSERT INTO subscription_email_notifications (subscription_id, propietario_id, tipo, programado_para)
    VALUES (NEW.id, NEW.propietario_id, 'subscription_canceled', NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_subscription_emails
  AFTER INSERT OR UPDATE ON suscripciones_locales
  FOR EACH ROW
  EXECUTE FUNCTION schedule_subscription_emails();

-- ============================================================================
-- 16. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON stripe_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stripe_setup_intents TO authenticated;
GRANT SELECT ON stripe_invoices TO authenticated;
GRANT SELECT ON subscription_email_notifications TO authenticated;
GRANT SELECT, INSERT ON subscription_trial_acceptances TO authenticated;
GRANT SELECT ON subscription_coupons TO authenticated;

-- Grant full access to service role (for webhooks)
GRANT ALL ON stripe_subscriptions TO service_role;
GRANT ALL ON stripe_setup_intents TO service_role;
GRANT ALL ON stripe_invoices TO service_role;
GRANT ALL ON stripe_webhook_events TO service_role;
GRANT ALL ON subscription_email_notifications TO service_role;
GRANT ALL ON payment_failure_tracking TO service_role;

-- ============================================================================
-- 17. INSERT DEFAULT PLANS (if not exist)
-- ============================================================================

-- Insert default plans if table is empty
INSERT INTO planes_suscripcion (
  nombre,
  descripcion,
  precio_mensual,
  duracion_meses,
  orden_visualizacion,
  recomendado,
  trial_habilitado,
  trial_dias,
  eventos_mes,
  promos_destacadas,
  perfil_social,
  panel_analisis,
  soporte_prioritario,
  visibilidad_extra,
  visibilidad_maxima,
  activo,
  caracteristicas,
  permisos
)
SELECT * FROM (VALUES
  (
    'Básico',
    'Plan gratuito con funcionalidades básicas para empezar',
    0.00,
    1,
    1,
    FALSE,
    FALSE,
    0,
    2,
    0,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    '["Perfil básico del local", "2 eventos por mes", "Visibilidad estándar"]'::jsonb,
    '{"crear_eventos": true, "publicar_posts": false, "destacar_local": false, "panel_analisis": false}'::jsonb
  ),
  (
    'Estándar',
    'Plan ideal para locales que quieren mayor visibilidad y engagement',
    29.99,
    1,
    2,
    TRUE,
    TRUE,
    30,
    10,
    2,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    TRUE,
    '["Perfil social completo", "10 eventos por mes", "2 destacados mensuales", "Visibilidad extra", "Estadísticas básicas"]'::jsonb,
    '{"crear_eventos": true, "publicar_posts": true, "destacar_local": true, "panel_analisis": false}'::jsonb
  ),
  (
    'Premium',
    'Plan completo con todas las funcionalidades y máxima visibilidad',
    79.99,
    1,
    3,
    FALSE,
    TRUE,
    30,
    999,
    10,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    '["Todo lo de Estándar", "Eventos ilimitados", "10 destacados mensuales", "Panel de análisis completo", "Soporte prioritario", "Visibilidad máxima"]'::jsonb,
    '{"crear_eventos": true, "publicar_posts": true, "destacar_local": true, "panel_analisis": true}'::jsonb
  )
) AS v(nombre, descripcion, precio_mensual, duracion_meses, orden_visualizacion, recomendado, trial_habilitado, trial_dias, eventos_mes, promos_destacadas, perfil_social, panel_analisis, soporte_prioritario, visibilidad_extra, visibilidad_maxima, activo, caracteristicas, permisos)
WHERE NOT EXISTS (SELECT 1 FROM planes_suscripcion LIMIT 1);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration creates a complete Stripe subscription system with:
-- ✅ Enhanced subscription plans with trial configuration
-- ✅ Stripe customer and payment method management
-- ✅ Full subscription lifecycle tracking
-- ✅ Setup intents for payment method collection
-- ✅ Invoice tracking and history
-- ✅ Webhook event processing
-- ✅ Email notification scheduling
-- ✅ Payment failure tracking and retry logic
-- ✅ Trial acceptance and terms agreement
-- ✅ Coupon system (prepared for future)
-- ✅ RLS policies for security
-- ✅ Helper functions for subscription management
-- ============================================================================
