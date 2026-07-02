-- =====================================================
-- Fonction RPC pour permettre aux utilisateurs anonymes
-- de répondre aux invitations via le lien public
-- =====================================================

-- Ajouter une contrainte UNIQUE sur (invitation_id, phone) pour supporter l'upsert
ALTER TABLE public.invitation_responses
  ADD CONSTRAINT uq_invitation_responses_invitation_phone
  UNIQUE (invitation_id, phone);

CREATE OR REPLACE FUNCTION public.respond_to_invitation(
  p_token VARCHAR(100),
  p_phone VARCHAR(20),
  p_response VARCHAR(20),
  p_guests_count INTEGER DEFAULT 1,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_invitation_id BIGINT;
  v_invitation RECORD;
BEGIN
  -- Trouver l'invitation par token
  SELECT id, status, response_deadline, max_guests
  INTO v_invitation
  FROM public.invitations
  WHERE unique_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation introuvable');
  END IF;

  -- Vérifier que l'invitation est active
  IF v_invitation.status != 'active' THEN
    RETURN jsonb_build_object('error', 'Cette invitation n''est plus active');
  END IF;

  -- Vérifier la deadline
  IF v_invitation.response_deadline IS NOT NULL AND v_invitation.response_deadline < NOW() THEN
    RETURN jsonb_build_object('error', 'La date limite de réponse a été dépassée');
  END IF;

  -- Vérifier la validité de la réponse
  IF p_response NOT IN ('accepted', 'declined', 'maybe') THEN
    RETURN jsonb_build_object('error', 'Réponse invalide');
  END IF;

  -- Limiter le nombre d'invités
  IF p_guests_count < 1 OR p_guests_count > v_invitation.max_guests THEN
    RETURN jsonb_build_object('error', 'Nombre d''invités invalide');
  END IF;

  -- Insérer ou mettre à jour la réponse
  INSERT INTO public.invitation_responses (
    invitation_id,
    phone,
    response,
    guests_count,
    notes,
    responded_at
  ) VALUES (
    v_invitation.id,
    p_phone,
    p_response,
    p_guests_count,
    p_notes,
    NOW()
  )
  ON CONFLICT (invitation_id, phone) DO UPDATE SET
    response = p_response,
    guests_count = p_guests_count,
    notes = p_notes,
    responded_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politique RLS pour permettre l'exécution par les utilisateurs anonymes
-- (SECURITY DEFINER contourne déjà les vérifications d'authentification)
