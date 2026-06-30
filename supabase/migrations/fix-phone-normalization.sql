-- =====================================================
-- Migration : Améliorer la normalisation des téléphones
-- Support du format US/Canada (+1) et autres pays
-- =====================================================

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
        -- Belgique
        NEW.phone := '+32' || substring(NEW.phone FROM 3);
      ELSIF prefix IN ('06', '07') THEN
        -- France
        NEW.phone := '+33' || substring(NEW.phone FROM 2);
      ELSIF prefix = '05' THEN
        -- Maroc
        NEW.phone := '+212' || substring(NEW.phone FROM 2);
      ELSIF prefix IN ('01', '03', '04', '05', '07', '08', '09') AND length(NEW.phone) = 11 THEN
        -- Amérique du Nord (001, 003, etc. → +1)
        NEW.phone := '+1' || substring(NEW.phone FROM 2);
      ELSE
        -- Défaut : Belgique
        NEW.phone := '+32' || substring(NEW.phone FROM 2);
      END IF;
      RETURN NEW;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer les triggers
DROP TRIGGER IF EXISTS normalize_contacts_phone ON public.contacts;
CREATE TRIGGER normalize_contacts_phone
BEFORE INSERT OR UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_number();

DROP TRIGGER IF EXISTS normalize_inbox_phone ON public.inbox_messages;
CREATE TRIGGER normalize_inbox_phone
BEFORE INSERT OR UPDATE ON public.inbox_messages
FOR EACH ROW EXECUTE FUNCTION public.normalize_phone_number();

SELECT '✅ Normalisation téléphone mise à jour (BE/FR/MA/US/CA)' AS status;
