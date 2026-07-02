-- =====================================================
-- FIX: sms_logs RLS + inbox + dashboard stats
-- Exécuter dans : Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Fix RLS sms_logs: permettre lecture via contact_id OU campaign_id
DROP POLICY IF EXISTS "Users view own sms_logs" ON public.sms_logs;
CREATE POLICY "Users view own sms_logs" ON public.sms_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contacts WHERE id = sms_logs.contact_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = sms_logs.campaign_id AND user_id = auth.uid())
  );

-- 2. Fix RLS sms_logs INSERT: permettre via contact_id OU campaign_id
DROP POLICY IF EXISTS "Users insert own sms_logs" ON public.sms_logs;
CREATE POLICY "Users insert own sms_logs" ON public.sms_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts WHERE id = sms_logs.contact_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = sms_logs.campaign_id AND user_id = auth.uid())
  );

-- 3. Créer la fonction SQL pour compter les SMS par utilisateur (utilisée par le Dashboard)
CREATE OR REPLACE FUNCTION public.get_user_sms_stats(p_user_id UUID)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_sent,
    COUNT(*) FILTER (WHERE sl.status = 'delivered')::BIGINT AS total_delivered,
    COALESCE(SUM(sl.cost), 0)::NUMERIC AS total_cost
  FROM public.sms_logs sl
  INNER JOIN public.contacts c ON c.id = sl.contact_id
  WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Créer la fonction SQL pour la timeline (Dashboard chart)
CREATE OR REPLACE FUNCTION public.get_user_sms_timeline(p_user_id UUID)
RETURNS TABLE (
  date TEXT,
  sent BIGINT,
  delivered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE(sl.sent_at), 'YYYY-MM-DD') AS date,
    COUNT(*)::BIGINT AS sent,
    COUNT(*) FILTER (WHERE sl.status = 'delivered')::BIGINT AS delivered
  FROM public.sms_logs sl
  INNER JOIN public.contacts c ON c.id = sl.contact_id
  WHERE c.user_id = p_user_id
    AND sl.sent_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(sl.sent_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
