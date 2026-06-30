-- =====================================================
-- SMSPro - Données seed (optionnel)
-- =====================================================
-- Ce script crée les segments par défaut pour les utilisateurs existants.
-- À exécuter APRÈS schema.sql et APRÈS avoir créé votre compte utilisateur.
--
-- ⚠️ REMPLACEZ 'YOUR_USER_ID' par votre UUID utilisateur
--    Trouvable dans : Supabase → Authentication → Users
-- =====================================================

-- Remplacez cette valeur par votre UUID utilisateur
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- ⚠️ À REMPLACER
BEGIN

  -- Vérifier que l'utilisateur existe
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Utilisateur % introuvable. Vérifiez votre UUID dans Authentication → Users', v_user_id;
  END IF;

  -- =====================================================
  -- Segments par défaut
  -- =====================================================

  INSERT INTO public.segments (user_id, name, description, conditions, contact_count)
  VALUES
    (v_user_id, 'Tous les contacts actifs', 'Contacts ayant donné leur consentement (RGPD)',
     '{"opted_in": true}'::jsonb, 0),

    (v_user_id, 'Nouveaux inscrits (30j)', 'Contacts ajoutés dans les 30 derniers jours',
     '{"opted_in": true, "date_range": "30d"}'::jsonb, 0),

    (v_user_id, 'Contacts Bruxelles', 'Contacts résidant à Bruxelles',
     '{"opted_in": true, "city": "Bruxelles"}'::jsonb, 0),

    (v_user_id, 'Clients VIP', 'Contacts taggés comme VIP',
     '{"opted_in": true, "tags": ["VIP"]}'::jsonb, 0),

    (v_user_id, 'Désabonnés', 'Contacts ayant répondu STOP',
     '{"opted_in": false}'::jsonb, 0)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- Règles d'auto-répondeur RGPD obligatoires
  -- =====================================================

  INSERT INTO public.auto_reply_rules (user_id, keyword, match_type, response_message, description, actions, is_active, trigger_count)
  VALUES
    (v_user_id, 'STOP', 'exact',
     'Vous avez été désabonné. Pour vous réinscrire, envoyez START au même numéro.',
     'Désabonnement RGPD obligatoire',
     '[{"type": "opt_in", "value": false}]'::jsonb,
     true, 0),

    (v_user_id, 'START', 'exact',
     'Bienvenue ! Vous êtes réinscrit à nos SMS. Envoyez STOP pour vous désinscrire.',
     'Réinscription rapide',
     '[{"type": "opt_in", "value": true}]'::jsonb,
     true, 0),

    (v_user_id, 'INFO', 'exact',
     'Plus d''infos sur notre site. Horaires Lu-Ve 9h-18h. Support par email.',
     'Demande d''informations',
     '[]'::jsonb,
     true, 0),

    (v_user_id, 'AIDE', 'exact',
     'Notre équipe support vous répond sous 24h. Email: support@votre-domaine.com',
     'Support / Assistance',
     '[]'::jsonb,
     true, 0)
  ON CONFLICT (user_id, keyword) DO NOTHING;

  RAISE NOTICE '✅ Seed terminé avec succès pour user %', v_user_id;
  RAISE NOTICE '📊 5 segments créés';
  RAISE NOTICE '⚡ 4 règles d''auto-répondeur créées';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes :';
  RAISE NOTICE '   1. Ajouter des contacts depuis l''interface';
  RAISE NOTICE '   2. Créer votre première campagne SMS';
  RAISE NOTICE '   3. Configurer Twilio dans Paramètres';

END $$;
