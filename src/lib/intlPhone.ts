/**
 * Validation et formatage international des numéros de téléphone
 * Supporte tous les pays (format E.164)
 *
 * E.164 : +[code pays][numéro], 7 à 15 chiffres après le +
 * Exemples :
 *   +32 470 12 34 56 (Belgique)
 *   +33 6 12 34 56 78 (France)
 *   +1 555 123 4567 (USA/Canada)
 *   +212 6 12 34 56 78 (Maroc)
 */

export interface PhoneValidation {
  valid: boolean
  formatted?: string
  country?: string
  error?: string
}

export interface CountryInfo {
  code: string // ISO code (BE, FR, etc.)
  name: string
  flag: string
  dialCode: string // +32, +33, etc.
}

/**
 * Pays supportés avec leurs codes
 * Ajouter d'autres pays selon vos marchés cibles
 */
export const COUNTRY_CODES: Record<string, CountryInfo> = {
  BE: { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32' },
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  CH: { code: 'CH', name: 'Suisse', flag: '🇨🇭', dialCode: '+41' },
  LU: { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352' },
  DE: { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
  NL: { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dialCode: '+31' },
  ES: { code: 'ES', name: 'Espagne', flag: '🇪🇸', dialCode: '+34' },
  IT: { code: 'IT', name: 'Italie', flag: '🇮🇹', dialCode: '+39' },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  GB: { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
  IE: { code: 'IE', name: 'Irlande', flag: '🇮🇪', dialCode: '+353' },
  US: { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
  CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  MA: { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212' },
  TN: { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216' },
  SN: { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  CI: { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
  CM: { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
}

/**
 * Liste prête pour les dropdowns
 */
export const SUPPORTED_COUNTRIES: CountryInfo[] = Object.values(COUNTRY_CODES)

/**
 * Détecte le code pays probable à partir d'un numéro formaté
 */
function detectCountryCode(digits: string): string | null {
  const sortedDialCodes = Object.values(COUNTRY_CODES)
    .map((c) => c.dialCode.substring(1))
    .sort((a, b) => b.length - a.length) // longest first (e.g., +212 before +21)

  for (const dial of sortedDialCodes) {
    if (digits.startsWith(dial)) {
      const country = Object.values(COUNTRY_CODES).find((c) => c.dialCode.substring(1) === dial)
      return country?.code || null
    }
  }
  return null
}

/**
 * Formate un numéro au format international E.164 (+CCXXXXXXXXX)
 *
 * @param phone Numéro en n'importe quel format
 * @param defaultCountry Code pays par défaut si le numéro ne commence pas par + ou 00
 */
export function formatPhoneInternational(phone: string, defaultCountry = 'BE'): string {
  if (!phone || typeof phone !== 'string') return ''

  // Nettoyer (espaces, tirets, parenthèses, points)
  let cleaned = phone.replace(/[\s\-().]/g, '').trim()

  // Déjà au format international avec +
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(1)
    if (/^\d{7,15}$/.test(digits)) return '+' + digits
    return cleaned
  }

  // Format 00CC... (indicatif international)
  if (cleaned.startsWith('00') && cleaned.length >= 10) {
    const without00 = cleaned.substring(2)
    if (/^\d{7,15}$/.test(without00)) return '+' + without00
  }

  // Format national 0XXXXXXXXX → ajouter code pays
  if (cleaned.startsWith('0') && cleaned.length >= 8 && cleaned.length <= 16) {
    const without0 = cleaned.substring(1)
    if (/^\d{6,15}$/.test(without0)) {
      const dialCode = COUNTRY_CODES[defaultCountry]?.dialCode || '+32'
      return dialCode + without0
    }
  }

  // Numéro sans préfixe, on ajoute le code pays par défaut
  if (/^\d{7,15}$/.test(cleaned)) {
    const dialCode = COUNTRY_CODES[defaultCountry]?.dialCode || '+32'
    return dialCode + cleaned
  }

  // Format non reconnu, retourner tel quel
  return cleaned
}

/**
 * Valide qu'un numéro est au format E.164 valide
 * (pas forcément un pays spécifique, juste le format international)
 */
export function validatePhoneInternational(phone: string): PhoneValidation {
  if (!phone) return { valid: false, error: 'Numéro vide' }

  const formatted = formatPhoneInternational(phone)

  if (!formatted.startsWith('+')) {
    return { valid: false, error: 'Format invalide - doit commencer par +' }
  }

  const digits = formatted.substring(1)
  if (!/^\d{7,15}$/.test(digits)) {
    return {
      valid: false,
      formatted,
      error: 'Le numéro doit contenir entre 7 et 15 chiffres',
    }
  }

  const countryCode = detectCountryCode(digits)
  return {
    valid: true,
    formatted,
    country: countryCode || undefined,
  }
}

/**
 * Détecte le pays d'un numéro (retourne le code ISO ou null)
 */
export function detectCountry(phone: string): string | null {
  const formatted = formatPhoneInternational(phone)
  if (!formatted.startsWith('+')) return null
  return detectCountryCode(formatted.substring(1))
}

/**
 * Retourne le drapeau + nom du pays pour affichage
 */
export function getCountryDisplay(phone: string): string {
  const country = detectCountry(phone)
  if (!country) return '🌍 International'
  const info = COUNTRY_CODES[country]
  return info ? `${info.flag} ${info.name}` : '🌍 International'
}
