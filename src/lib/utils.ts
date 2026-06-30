/**
 * Utilitaires généraux de l'application
 *
 * Ce fichier regroupe toutes les fonctions utilitaires :
 * - Formatage (dates, monétaires, numéros)
 * - Validation et formatage téléphone (délégué à @/lib/intlPhone)
 * - Helpers UI (escapeHtml, getInitials, debounce)
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Réexport des fonctions de téléphone depuis le module dédié
export {
  formatPhoneInternational,
  validatePhoneInternational,
  detectCountry,
  SUPPORTED_COUNTRIES,
  getCountryDisplay,
} from '@/lib/intlPhone'

import {
  formatPhoneInternational as formatPhoneIntl,
  validatePhoneInternational,
} from '@/lib/intlPhone'

// =====================================================
// TÉLÉPHONE — rétrocompatibilité
// =====================================================

/**
 * @deprecated Utilisez formatPhoneInternational directement
 * Conservé pour ne pas casser le code existant
 */
export function formatPhoneBelgium(phone: string): string {
  return formatPhoneIntl(phone, 'BE')
}

/**
 * @deprecated Utilisez validatePhoneInternational directement
 */
export function validatePhoneBelgium(phone: string): boolean {
  return validatePhoneInternational(phone).valid
}

// =====================================================
// DATES
// =====================================================

/**
 * Formate une date relative en français ("il y a 2 jours")
 */
export function formatRelativeDate(date: string | Date): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true, locale: fr })
  } catch {
    return ''
  }
}

/**
 * Formate une date complète (par défaut : "dd MMM yyyy à HH:mm")
 */
export function formatDate(date: string | Date, fmt = 'dd MMM yyyy à HH:mm'): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt, { locale: fr })
  } catch {
    return ''
  }
}

// =====================================================
// NOMBRES & MONNAIE
// =====================================================

/**
 * Formate un montant en euros (1 234,56 €)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0)
}

/**
 * Formate un nombre avec séparateurs (1 234)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-BE').format(num || 0)
}

/**
 * Tronque un texte avec ellipse
 */
export function truncate(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// =====================================================
// EMAIL & VALIDATION
// =====================================================

/**
 * Validation email simple
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
}

/**
 * Génère un ID numérique unique monotone (évite les collisions)
 */
let _idCounter = Date.now()
export function nextId(): number {
  _idCounter += 1
  return _idCounter
}

// =====================================================
// SÉCURITÉ
// =====================================================

/**
 * Échappement HTML pour éviter le XSS
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// =====================================================
// UI HELPERS
// =====================================================

/**
 * Initiales à partir d'un nom
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

/**
 * Debounce d'une fonction (limite la fréquence d'appel)
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// =====================================================
// SMS
// =====================================================

/**
 * Personnalise un message avec des variables {prenom}, {nom}, {ville}
 */
export function personalizeMessage(
  template: string,
  contact: { first_name?: string; last_name?: string; city?: string }
): string {
  if (!template) return ''
  return template
    .replace(/\{prenom\}/gi, contact.first_name || '')
    .replace(/\{nom\}/gi, contact.last_name || '')
    .replace(/\{ville\}/gi, contact.city || '')
}

/**
 * Calcule le nombre de SMS nécessaires selon la longueur
 * (1 SMS = 160 caractères, caractères spéciaux comptent double)
 */
export function calculateSMSCount(text: string): number {
  if (!text) return 0
  let length = 0
  for (const char of text) {
    if (char.charCodeAt(0) > 127) length += 2
    else length += 1
  }
  if (length <= 160) return 1
  return Math.ceil(length / 153)
}

// =====================================================
// COULEURS & STATUS
// =====================================================

/**
 * Classes CSS pour les badges de statut
 */
export const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  sending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  queued: 'bg-blue-50 text-blue-700 border-blue-200',
  undelivered: 'bg-red-50 text-red-700 border-red-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  opted_out: 'bg-slate-100 text-slate-600 border-slate-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  maybe: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
}

/**
 * Labels français pour les statuts
 */
export const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifiée',
  sending: 'En cours',
  sent: 'Envoyée',
  delivered: 'Délivré',
  failed: 'Échoué',
  queued: 'En attente',
  undelivered: 'Non délivré',
  active: 'Actif',
  opted_out: 'Désabonné',
  accepted: 'Accepté',
  declined: 'Refusé',
  maybe: 'Peut-être',
  pending: 'En attente',
}
