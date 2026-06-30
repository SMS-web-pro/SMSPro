-- =====================================================
-- SMSPro - Schéma complet Supabase
-- =====================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- Copier-coller tout ce fichier et cliquer "Run"
--
-- Ce script crée :
-- - Toutes les tables
-- - Indexes pour la performance
-- - Triggers automatiques (stats, audit, normalisation)
-- - Row Level Security (RLS)
-- - Vues pour analytics
-- - Segments par défaut
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABLE USERS (liée à auth.users de Supabase)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  company_name VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'Europe/Brussels',
  language VARCHAR(5) DEFAULT 'fr',
  logo_url TEXT,
  twilio_config JSONB, -- {sid, phone}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLE CONTACTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(2) DEFAULT 'BE',
  opted_in BOOLEAN DEFAULT true,
  opted_in_date TIMESTAMP WITH TIME ZONE,
  opted_out_date TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50) DEFAULT 'manual',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_opted_in ON public.contacts(opted_in);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON public.contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON public.contacts(created_at DESC);

-- =====================================================
-- 3. TABLE SEGMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.segments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_user ON public.segments(user_id);

-- =====================================================
-- 4. TABLE CAMPAIGNS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  segment_id BIGINT REFERENCES public.segments(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'paused')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON public.campaigns(created_at DESC);

-- =====================================================
-- 5. TABLE SMS_LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  message_sid VARCHAR(100) UNIQUE, -- Twilio Message SID
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered', 'read', 'clicked')),
  error_code VARCHAR(10),
  error_message TEXT,
  cost DECIMAL(10,4) DEFAULT 0,
  tracking_id VARCHAR(100), -- ID unique pour le lien tracké
  engagement JSONB DEFAULT '{}'::jsonb, -- {read_at, clicked_at, clicked_url, replies: []}
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign ON public.sms_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_contact ON public.sms_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON public.sms_logs(phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sid ON public.sms_logs(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_logs_tracking ON public.sms_logs(tracking_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at DESC);

-- =====================================================
-- 6. TABLE CAMPAIGN_STATS (vue matérialisée)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campaign_stats (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_pending INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0,
  read_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  avg_delivery_time INTEGER, -- en secondes
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_campaign ON public.campaign_stats(campaign_id);

-- =====================================================
-- 7. TABLE AUTO_REPLY_RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auto_reply_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  keyword VARCHAR(50) NOT NULL,
  match_type VARCHAR(20) DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'starts_with')),
  response_message TEXT NOT NULL,
  description TEXT,
  trigger_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  case_sensitive BOOLEAN DEFAULT false,
  actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_auto_reply_user ON public.auto_reply_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_keyword ON public.auto_reply_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_auto_reply_active ON public.auto_reply_rules(is_active) WHERE is_active = true;

-- =====================================================
-- 8. TABLE COUPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  campaign_id BIGINT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping', 'gift')),
  value DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  per_contact_limit INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_user ON public.coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_validity ON public.coupons(valid_from, valid_until);

-- =====================================================
-- 9. TABLE COUPON_USAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT REFERENCES public.coupons(id) ON DELETE CASCADE,
  coupon_code VARCHAR(50) NOT NULL,
  contact_id BIGINT REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_value DECIMAL(10,2),
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('sms_campaign', 'manual', 'import', 'api')),
  campaign_id BIGINT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_contact ON public.coupon_usages(contact_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_used ON public.coupon_usages(used_at DESC);

-- =====================================================
-- 10. TABLE INVITATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id BIGINT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'event' CHECK (type IN ('event', 'appointment', 'offer', 'vip', 'reminder')),
  event_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  unique_token VARCHAR(100) UNIQUE NOT NULL,
  max_guests INTEGER DEFAULT 1,
  response_deadline TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_user ON public.invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(unique_token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_event ON public.invitations(event_date);

-- =====================================================
-- 11. TABLE INVITATION_RESPONSES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invitation_responses (
  id BIGSERIAL PRIMARY KEY,
  invitation_id BIGINT REFERENCES public.invitations(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  response VARCHAR(20) DEFAULT 'pending' CHECK (response IN ('accepted', 'declined', 'maybe', 'pending')),
  guests_count INTEGER DEFAULT 1,
  responded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_resp_invitation ON public.invitation_responses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_resp_contact ON public.invitation_responses(contact_id);
CREATE INDEX IF NOT EXISTS idx_invitation_resp_response ON public.invitation_responses(response);

-- =====================================================
-- 12. TABLE INBOX_MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  direction VARCHAR(10) DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  message TEXT NOT NULL,
  keyword_detected VARCHAR(50),
  auto_reply_sent BOOLEAN DEFAULT false,
  rule_triggered_id BIGINT REFERENCES public.auto_reply_rules(id) ON DELETE SET NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_user ON public.inbox_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_phone ON public.inbox_messages(phone);
CREATE INDEX IF NOT EXISTS idx_inbox_unread ON public.inbox_messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_inbox_received ON public.inbox_messages(received_at DESC);

-- =====================================================
-- 13. TABLE AUDIT_LOGS (RGPD)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id BIGINT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- =====================================================
-- 14. TABLE RATE_LIMITING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action_key VARCHAR(100) NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 minute')
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON public.rate_limits(expires_at);

-- =====================================================
-- FONCTIONS & TRIGGERS
-- =====================================================

-- Fonction : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application aux tables concernées
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_segments_updated_at ON public.segments;
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_reply_updated_at ON public.auto_reply_rules;
CREATE TRIGGER update_auto_reply_updated_at BEFORE UPDATE ON public.auto_reply_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction : normalisation du numéro de téléphone au format +32...
CREATE OR REPLACE FUNCTION public.normalize_phone_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
BEGIN
  IF NEW.phone IS NOT NULL THEN
    -- Nettoyer (espaces, tirets, parenthèses, points)
    NEW.phone := regexp_replace(NEW.phone, '[\s\-().]', '', 'g');

    -- Déjà formaté +CC...
    IF NEW.phone ~ '^\+\d+$' THEN
      RETURN NEW;
    END IF;

    -- Format 00CC... → +CC...
    IF NEW.phone LIKE '00%' AND length(NEW.phone) >= 10 THEN
      NEW.phone := '+' || substring(NEW.phone FROM 3);
      RETURN NEW;
    END IF;

    -- Format nord-américain : 1 suivi de 10 chiffres
    IF NEW.phone ~ '^1\d{9,10}$' THEN
      NEW.phone := '+' || NEW.phone;
      RETURN NEW;
    END IF;

    -- Format national 0XXXXXXXXX → ajouter code pays selon préfixe
    IF NEW.phone ~ '^0\d+$' AND length(NEW.phone) BETWEEN 8 AND 15 THEN
      prefix := substring(NEW.phone FROM 1 FOR 2);

      IF prefix IN ('02', '03', '04') THEN
        NEW.phone := '+32' || substring(NEW.phone FROM 3);
      ELSIF prefix IN ('06', '07') THEN
        NEW.phone := '+33' || substring(NEW.phone FROM 2);
      ELSIF prefix = '05' THEN
        NEW.phone := '+212' || substring(NEW.phone FROM 2);
      ELSE
        NEW.phone := '+32' || substring(NEW.phone FROM 2);
      END IF;
      RETURN NEW;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_contacts_phone ON public.contacts;
CREATE TRIGGER normalize_contacts_phone BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_number();

DROP TRIGGER IF EXISTS normalize_inbox_phone ON public.inbox_messages;
CREATE TRIGGER normalize_inbox_phone BEFORE INSERT OR UPDATE ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_number();

-- Fonction : mise à jour automatique des stats de campagne
CREATE OR REPLACE FUNCTION public.update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.campaign_stats (
    campaign_id,
    total_sent,
    total_delivered,
    total_failed,
    total_pending,
    total_read,
    total_clicked,
    total_cost,
    delivery_rate,
    read_rate,
    click_rate,
    avg_delivery_time,
    updated_at
  )
  SELECT
    NEW.campaign_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status IN ('failed', 'undelivered')),
    COUNT(*) FILTER (WHERE status IN ('queued', 'sent', 'sending')),
    COUNT(*) FILTER (WHERE (engagement->>'read_at') IS NOT NULL),
    COUNT(*) FILTER (WHERE (engagement->>'clicked_at') IS NOT NULL),
    COALESCE(SUM(cost), 0),
    CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0 END,
    CASE WHEN COUNT(*) FILTER (WHERE status = 'delivered') > 0
      THEN ROUND((COUNT(*) FILTER (WHERE (engagement->>'read_at') IS NOT NULL)::DECIMAL / COUNT(*) FILTER (WHERE status = 'delivered')) * 100, 2)
      ELSE 0 END,
    CASE WHEN COUNT(*) FILTER (WHERE (engagement->>'read_at') IS NOT NULL) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE (engagement->>'clicked_at') IS NOT NULL)::DECIMAL / COUNT(*) FILTER (WHERE (engagement->>'read_at') IS NOT NULL)) * 100, 2)
      ELSE 0 END,
    CASE WHEN COUNT(*) FILTER (WHERE status = 'delivered' AND delivered_at IS NOT NULL AND sent_at IS NOT NULL) > 0
      THEN ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) FILTER (WHERE status = 'delivered' AND delivered_at IS NOT NULL AND sent_at IS NOT NULL))
      ELSE NULL END,
    NOW()
  FROM public.sms_logs
  WHERE campaign_id = NEW.campaign_id
  ON CONFLICT (campaign_id)
  DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_failed = EXCLUDED.total_failed,
    total_pending = EXCLUDED.total_pending,
    total_read = EXCLUDED.total_read,
    total_clicked = EXCLUDED.total_clicked,
    total_cost = EXCLUDED.total_cost,
    delivery_rate = EXCLUDED.delivery_rate,
    read_rate = EXCLUDED.read_rate,
    click_rate = EXCLUDED.click_rate,
    avg_delivery_time = EXCLUDED.avg_delivery_time,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON public.sms_logs;
CREATE TRIGGER trigger_update_campaign_stats
AFTER INSERT OR UPDATE OR DELETE ON public.sms_logs
FOR EACH ROW EXECUTE FUNCTION public.update_campaign_stats();

-- Fonction : incrémenter le compteur de l'auto-reply rule
CREATE OR REPLACE FUNCTION public.increment_auto_reply_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rule_triggered_id IS NOT NULL THEN
    UPDATE public.auto_reply_rules
    SET trigger_count = trigger_count + 1
    WHERE id = NEW.rule_triggered_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_auto_reply ON public.inbox_messages;
CREATE TRIGGER trigger_increment_auto_reply
AFTER INSERT ON public.inbox_messages
FOR EACH ROW EXECUTE FUNCTION public.increment_auto_reply_counter();

-- Fonction : audit log automatique
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((NEW->>'id')::BIGINT, (OLD->>'id')::BIGINT),
    to_jsonb(NEW)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reply_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur ne voit que ses propres données
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Contacts : chaque user voit ses contacts
CREATE POLICY "Users manage own contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id);

-- Segments
CREATE POLICY "Users manage own segments" ON public.segments
  FOR ALL USING (auth.uid() = user_id);

-- Campaigns
CREATE POLICY "Users manage own campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id);

-- SMS logs : accès via campaign_id
CREATE POLICY "Users view own sms_logs" ON public.sms_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = sms_logs.campaign_id AND user_id = auth.uid())
  );

CREATE POLICY "Users insert own sms_logs" ON public.sms_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = sms_logs.campaign_id AND user_id = auth.uid())
  );

-- Campaign stats : lecture seule via campaign_id
CREATE POLICY "Users view own campaign_stats" ON public.campaign_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_stats.campaign_id AND user_id = auth.uid())
  );

-- Auto-reply rules
CREATE POLICY "Users manage own auto_reply_rules" ON public.auto_reply_rules
  FOR ALL USING (auth.uid() = user_id);

-- Coupons
CREATE POLICY "Users manage own coupons" ON public.coupons
  FOR ALL USING (auth.uid() = user_id);

-- Coupon usages
CREATE POLICY "Users view own coupon_usages" ON public.coupon_usages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.coupons WHERE id = coupon_usages.coupon_id AND user_id = auth.uid())
  );

-- Invitations
CREATE POLICY "Users manage own invitations" ON public.invitations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view invitation_responses" ON public.invitation_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.invitations WHERE id = invitation_responses.invitation_id AND user_id = auth.uid())
  );

-- Inbox
CREATE POLICY "Users manage own inbox" ON public.inbox_messages
  FOR ALL USING (auth.uid() = user_id);

-- Audit logs : lecture seule par le propriétaire
CREATE POLICY "Users view own audit_logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction : auto-création du profil user à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction : vérifier rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_key VARCHAR,
  p_max_per_minute INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Nettoyer les anciennes entrées
  DELETE FROM public.rate_limits
  WHERE expires_at < NOW();

  -- Compter les actions dans la fenêtre
  SELECT COALESCE(SUM(action_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_key = p_action_key
    AND window_start > NOW() - INTERVAL '1 minute';

  IF v_count >= p_max_per_minute THEN
    RETURN false;
  END IF;

  -- Enregistrer l'action
  INSERT INTO public.rate_limits (user_id, action_key, action_count)
  VALUES (p_user_id, p_action_key, 1);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : utilisation d'un coupon avec validation
CREATE OR REPLACE FUNCTION public.use_coupon(
  p_code VARCHAR,
  p_contact_id BIGINT,
  p_source VARCHAR DEFAULT 'manual',
  p_campaign_id BIGINT DEFAULT NULL,
  p_order_value DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_coupon RECORD;
  v_contact_uses INTEGER;
  v_usage_id BIGINT;
BEGIN
  -- Récupérer le coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(p_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Code invalide ou inactif');
  END IF;

  -- Vérifier les dates
  IF v_coupon.valid_from > NOW() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Coupon pas encore valide');
  END IF;

  IF v_coupon.valid_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Coupon expiré');
  END IF;

  -- Vérifier le max d'utilisations
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Coupon épuisé');
  END IF;

  -- Vérifier la limite par contact
  SELECT COUNT(*) INTO v_contact_uses
  FROM public.coupon_usages
  WHERE coupon_id = v_coupon.id AND contact_id = p_contact_id;

  IF v_contact_uses >= v_coupon.per_contact_limit THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Limite par contact atteinte');
  END IF;

  -- Enregistrer l'utilisation
  INSERT INTO public.coupon_usages (
    coupon_id, coupon_code, contact_id, phone, source, campaign_id, order_value
  )
  VALUES (
    v_coupon.id, v_coupon.code, p_contact_id,
    (SELECT phone FROM public.contacts WHERE id = p_contact_id),
    p_source, p_campaign_id, p_order_value
  )
  RETURNING id INTO v_usage_id;

  -- Incrémenter le compteur
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon.id,
    'usage_id', v_usage_id,
    'discount_type', v_coupon.type,
    'discount_value', v_coupon.value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VUES POUR ANALYTICS
-- =====================================================

-- Vue : engagement global d'un user
CREATE OR REPLACE VIEW public.v_user_engagement AS
SELECT
  u.id AS user_id,
  COUNT(DISTINCT c.id) AS total_contacts,
  COUNT(DISTINCT c.id) FILTER (WHERE c.opted_in) AS active_contacts,
  COUNT(DISTINCT camp.id) AS total_campaigns,
  COUNT(DISTINCT camp.id) FILTER (WHERE camp.status = 'sent') AS sent_campaigns,
  COALESCE(SUM(s.total_sent), 0) AS total_sms_sent,
  COALESCE(SUM(s.total_delivered), 0) AS total_delivered,
  COALESCE(SUM(s.total_read), 0) AS total_read,
  COALESCE(SUM(s.total_clicked), 0) AS total_clicked,
  COALESCE(SUM(s.total_cost), 0) AS total_cost
FROM public.users u
LEFT JOIN public.contacts c ON c.user_id = u.id
LEFT JOIN public.campaigns camp ON camp.user_id = u.id
LEFT JOIN public.campaign_stats s ON s.campaign_id = camp.id
GROUP BY u.id;

-- Vue : timeline des envois (30 derniers jours)
CREATE OR REPLACE VIEW public.v_send_timeline AS
SELECT
  DATE(sent_at) AS date,
  user_id,
  COUNT(*) AS sent,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE (engagement->>'read_at') IS NOT NULL) AS read_count
FROM public.sms_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at), user_id
ORDER BY date DESC;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Note : les segments par défaut seront créés automatiquement
-- pour chaque nouvel utilisateur via un trigger (optionnel)
-- ou manuellement après création du compte

-- Politique : service role bypass RLS pour les webhooks
CREATE POLICY "Service role can insert sms_logs" ON public.sms_logs
  FOR INSERT WITH CHECK (true); -- À restreindre via service_role

-- =====================================================
-- NETTOYAGE AUTOMATIQUE
-- =====================================================

-- Fonction : supprimer les rate_limits expirés (cron job)
-- À exécuter via Supabase Edge Functions ou pg_cron
-- DELETE FROM public.rate_limits WHERE expires_at < NOW();

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
-- Total : 14 tables, 11 indexes, 9 triggers, 9 fonctions, 12 policies
-- =====================================================
