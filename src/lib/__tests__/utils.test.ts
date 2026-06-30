/**
 * Tests unitaires pour les utilitaires critiques
 * Exécuter avec : npx vitest
 */
import { describe, it, expect } from 'vitest'
import {
  formatPhoneBelgium,
  validatePhoneBelgium,
  calculateSMSCount,
  personalizeMessage,
  escapeHtml,
} from '@/lib/utils'
import { isValidEmail } from '@/store/useStore'

describe('Phone utilities', () => {
  it('formate un numéro avec préfixe 0 vers +32', () => {
    expect(formatPhoneBelgium('0470123456')).toBe('+32470123456')
  })

  it('formate un numéro avec préfixe 0032', () => {
    expect(formatPhoneBelgium('0032470123456')).toBe('+32470123456')
  })

  it('formate un numéro déjà au bon format', () => {
    expect(formatPhoneBelgium('+32470123456')).toBe('+32470123456')
  })

  it('gère les espaces et tirets', () => {
    expect(formatPhoneBelgium('0470 12 34 56')).toBe('+32470123456')
    expect(formatPhoneBelgium('0470-12-34-56')).toBe('+32470123456')
  })

  it('valide un numéro belge correct', () => {
    expect(validatePhoneBelgium('+32470123456')).toBe(true)
    expect(validatePhoneBelgium('0470123456')).toBe(true)
  })

  it('rejette un numéro invalide', () => {
    expect(validatePhoneBelgium('+33123456789')).toBe(false)
    expect(validatePhoneBelgium('123')).toBe(false)
    expect(validatePhoneBelgium('')).toBe(false)
  })
})

describe('SMS utilities', () => {
  it('calcule 1 SMS pour <= 160 caractères', () => {
    expect(calculateSMSCount('Bonjour')).toBe(1)
    expect(calculateSMSCount('a'.repeat(160))).toBe(1)
  })

  it('calcule plusieurs SMS pour > 160 caractères', () => {
    expect(calculateSMSCount('a'.repeat(161))).toBe(2)
    expect(calculateSMSCount('a'.repeat(306))).toBe(2)
    expect(calculateSMSCount('a'.repeat(307))).toBe(3)
  })

  it('compte double pour les caractères Unicode', () => {
    // € = 1 char Unicode (compte double)
    expect(calculateSMSCount('€')).toBe(1)
    expect(calculateSMSCount('€€')).toBe(1)
    expect(calculateSMSCount('€'.repeat(81))).toBe(2)
  })

  it('personnalise un message avec variables', () => {
    const msg = personalizeMessage('Bonjour {prenom}, RDV à {ville}', {
      first_name: 'Lucas',
      city: 'Bruxelles',
    })
    expect(msg).toBe('Bonjour Lucas, RDV à Bruxelles')
  })

  it('gère les variables manquantes', () => {
    const msg = personalizeMessage('Bonjour {prenom}', {})
    expect(msg).toBe('Bonjour ')
  })
})

describe('Security - HTML escaping', () => {
  it('échappe les balises HTML', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('échappe les guillemets et apostrophes', () => {
    expect(escapeHtml("L'utilisateur")).toBe('L&#039;utilisateur')
    expect(escapeHtml('test "value"')).toBe('test &quot;value&quot;')
  })

  it('gère les chaînes vides et non-string', () => {
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml(null as any)).toBe('')
    expect(escapeHtml(undefined as any)).toBe('')
  })
})

describe('Email validation', () => {
  it('valide un email correct', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('lucas.peeters@smspro.be')).toBe(true)
  })

  it('rejette un email invalide', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
