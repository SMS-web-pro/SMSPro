/**
 * Client Supabase pour SMSPro
 *
 * Architecture :
 * - Toutes les opérations DB passent par cette lib
 * - Mode démo : retourne les données du store Zustand local
 * - Mode production : appelle Supabase via fetch REST ou Realtime
 *
 * IMPORTANT : Cette lib gère automatiquement le mode démo
 * pour ne JAMAIS appeler Supabase quand l'utilisateur est en démo.
 */

import type {
  Contact,
  Campaign,
  AutoReplyRule,
  Coupon,
  Invitation,
  InboxMessage,
} from '@/types'
import { useStore } from '@/store/useStore'

const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || ''
const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || ''

/**
 * Vérifie si Supabase est configuré
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

/**
 * Headers par défaut pour les requêtes Supabase
 */
function getHeaders(includeAuth = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  }
  if (includeAuth) {
    const token = localStorage.getItem('sb-access-token') || SUPABASE_ANON_KEY
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Helper pour les requêtes Supabase REST
 */
async function supabaseRequest<T>(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: any
    query?: string
    prefer?: string
  } = {}
): Promise<T> {
  const { method = 'GET', body, query = '', prefer } = options
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`
  const headers = getHeaders()
  if (prefer) headers['Prefer'] = prefer

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase error [${response.status}]: ${errorText}`)
  }

  if (response.status === 204) return null as T
  return response.json()
}

/**
 * Garde de mode démo : si l'utilisateur est en démo,
 * on intercepte l'appel et on utilise le store Zustand à la place.
 */
function demoGuard<T>(fn: () => Promise<T>): Promise<T | null> {
  const state = useStore.getState()
  if (state.isDemo) {
    // En mode démo, les opérations sont déjà gérées par le store
    // On retourne null pour signaler "pas d'appel API"
    return Promise.resolve(null)
  }
  return fn()
}

// =====================================================
// CONTACTS
// =====================================================

export async function fetchContacts(): Promise<Contact[]> {
  return demoGuard(async () => {
    return supabaseRequest<Contact[]>('contacts', {
      query: '?select=*&order=created_at.desc',
    })
  }).then((r) => r || useStore.getState().contacts)
}

export async function createContact(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
  return demoGuard(async () => {
    return supabaseRequest<Contact>('contacts', {
      method: 'POST',
      body: contact,
      prefer: 'return=representation',
    })
  }).then((r) => r as Contact)
}

export async function updateContact(id: number, updates: Partial<Contact>): Promise<Contact> {
  return demoGuard(async () => {
    return supabaseRequest<Contact>(`contacts?id=eq.${id}`, {
      method: 'PATCH',
      body: updates,
      prefer: 'return=representation',
    })
  }).then((r) => r as Contact)
}

export async function deleteContact(id: number): Promise<void> {
  return demoGuard(async () => {
    return supabaseRequest<void>(`contacts?id=eq.${id}`, { method: 'DELETE' })
  }).then(() => undefined)
}

// =====================================================
// CAMPAIGNS
// =====================================================

export async function fetchCampaigns(): Promise<Campaign[]> {
  return demoGuard(async () => {
    return supabaseRequest<Campaign[]>('campaigns', {
      query: '?select=*&order=created_at.desc',
    })
  }).then((r) => r || useStore.getState().campaigns)
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
  return demoGuard(async () => {
    return supabaseRequest<Campaign>('campaigns', {
      method: 'POST',
      body: campaign,
      prefer: 'return=representation',
    })
  }).then((r) => r as Campaign)
}

export async function updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
  return demoGuard(async () => {
    return supabaseRequest<Campaign>(`campaigns?id=eq.${id}`, {
      method: 'PATCH',
      body: updates,
      prefer: 'return=representation',
    })
  }).then((r) => r as Campaign)
}

export async function deleteCampaign(id: number): Promise<void> {
  return demoGuard(async () => {
    return supabaseRequest<void>(`campaigns?id=eq.${id}`, { method: 'DELETE' })
  }).then(() => undefined)
}

// =====================================================
// AUTO-REPLY
// =====================================================

export async function fetchAutoReplyRules(): Promise<AutoReplyRule[]> {
  return demoGuard(async () => {
    return supabaseRequest<AutoReplyRule[]>('auto_reply_rules', {
      query: '?select=*&order=keyword.asc',
    })
  }).then((r) => r || useStore.getState().autoReplyRules)
}

export async function createAutoReplyRule(rule: Omit<AutoReplyRule, 'id' | 'created_at' | 'updated_at' | 'trigger_count'>): Promise<AutoReplyRule> {
  return demoGuard(async () => {
    return supabaseRequest<AutoReplyRule>('auto_reply_rules', {
      method: 'POST',
      body: { ...rule, trigger_count: 0 },
      prefer: 'return=representation',
    })
  }).then((r) => r as AutoReplyRule)
}

export async function updateAutoReplyRule(id: number, updates: Partial<AutoReplyRule>): Promise<AutoReplyRule> {
  return demoGuard(async () => {
    return supabaseRequest<AutoReplyRule>(`auto_reply_rules?id=eq.${id}`, {
      method: 'PATCH',
      body: { ...updates, updated_at: new Date().toISOString() },
      prefer: 'return=representation',
    })
  }).then((r) => r as AutoReplyRule)
}

export async function deleteAutoReplyRule(id: number): Promise<void> {
  return demoGuard(async () => {
    return supabaseRequest<void>(`auto_reply_rules?id=eq.${id}`, { method: 'DELETE' })
  }).then(() => undefined)
}

// =====================================================
// COUPONS
// =====================================================

export async function fetchCoupons(): Promise<Coupon[]> {
  return demoGuard(async () => {
    return supabaseRequest<Coupon[]>('coupons', {
      query: '?select=*&order=created_at.desc',
    })
  }).then((r) => r || useStore.getState().coupons)
}

export async function createCoupon(coupon: Omit<Coupon, 'id' | 'created_at' | 'current_uses'>): Promise<Coupon> {
  return demoGuard(async () => {
    return supabaseRequest<Coupon>('coupons', {
      method: 'POST',
      body: { ...coupon, current_uses: 0 },
      prefer: 'return=representation',
    })
  }).then((r) => r as Coupon)
}

export async function updateCoupon(id: number, updates: Partial<Coupon>): Promise<Coupon> {
  return demoGuard(async () => {
    return supabaseRequest<Coupon>(`coupons?id=eq.${id}`, {
      method: 'PATCH',
      body: updates,
      prefer: 'return=representation',
    })
  }).then((r) => r as Coupon)
}

export async function deleteCoupon(id: number): Promise<void> {
  return demoGuard(async () => {
    return supabaseRequest<void>(`coupons?id=eq.${id}`, { method: 'DELETE' })
  }).then(() => undefined)
}

export async function useCouponRPC(code: string, contactId: number): Promise<{
  success: boolean
  reason?: string
  coupon_id?: number
  discount_type?: string
  discount_value?: number
}> {
  return demoGuard(async () => {
    const result = await supabaseRequest<any>('rpc/use_coupon', {
      method: 'POST',
      body: { p_code: code, p_contact_id: contactId },
    })
    return result
  }).then((r) => r || { success: false, reason: 'Mode démo' })
}

// =====================================================
// INVITATIONS
// =====================================================

export async function fetchInvitations(): Promise<Invitation[]> {
  return demoGuard(async () => {
    return supabaseRequest<Invitation[]>('invitations', {
      query: '?select=*&order=created_at.desc',
    })
  }).then((r) => r || useStore.getState().invitations)
}

export async function createInvitation(inv: Omit<Invitation, 'id' | 'created_at' | 'unique_token' | 'status' | 'responses'>): Promise<Invitation> {
  return demoGuard(async () => {
    return supabaseRequest<Invitation>('invitations', {
      method: 'POST',
      body: { ...inv, status: 'active', responses: [] },
      prefer: 'return=representation',
    })
  }).then((r) => r as Invitation)
}

// =====================================================
// INBOX
// =====================================================

export async function fetchInboxMessages(): Promise<InboxMessage[]> {
  return demoGuard(async () => {
    return supabaseRequest<InboxMessage[]>('inbox_messages', {
      query: '?select=*&order=received_at.desc&limit=100',
    })
  }).then((r) => r || useStore.getState().inboxMessages)
}

export async function markInboxMessageRead(id: number): Promise<void> {
  return demoGuard(async () => {
    return supabaseRequest<void>(`inbox_messages?id=eq.${id}`, {
      method: 'PATCH',
      body: { is_read: true },
    })
  }).then(() => undefined)
}

// =====================================================
// SETTINGS (profil utilisateur)
// =====================================================

export async function updateUserSettings(updates: {
  company_name?: string
  contact_email?: string
  timezone?: string
  language?: string
  logo_url?: string
  twilio_config?: any
}): Promise<void> {
  return demoGuard(async () => {
    const userId = localStorage.getItem('sb-user-id')
    if (!userId) throw new Error('Utilisateur non authentifié')
    return supabaseRequest<void>(`users?id=eq.${userId}`, {
      method: 'PATCH',
      body: { ...updates, updated_at: new Date().toISOString() },
    })
  }).then(() => undefined)
}

export async function fetchUserSettings(): Promise<any> {
  return demoGuard(async () => {
    const userId = localStorage.getItem('sb-user-id')
    if (!userId) throw new Error('Utilisateur non authentifié')
    const result = await supabaseRequest<any[]>(`users?id=eq.${userId}&select=*`)
    return result[0]
  }).then((r) => r || null)
}

// =====================================================
// STATS (via vue)
// =====================================================

export async function fetchDashboardStats(): Promise<{
  totalContacts: number
  activeContacts: number
  totalCampaigns: number
  totalSent: number
  totalDelivered: number
  totalCost: number
  deliveryRate: number
}> {
  return demoGuard(async () => {
    const result = await supabaseRequest<any>('v_user_engagement?select=*')
    const row = Array.isArray(result) ? result[0] : result
    return {
      totalContacts: row?.total_contacts || 0,
      activeContacts: row?.active_contacts || 0,
      totalCampaigns: row?.total_campaigns || 0,
      totalSent: row?.total_sms_sent || 0,
      totalDelivered: row?.total_delivered || 0,
      totalCost: row?.total_cost || 0,
      deliveryRate: row?.total_sms_sent > 0
        ? Math.round((row.total_delivered / row.total_sms_sent) * 10000) / 100
        : 0,
    }
  }).then((r) => r || {
    totalContacts: 0,
    activeContacts: 0,
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalCost: 0,
    deliveryRate: 0,
  })
}

export async function fetchTimeline(): Promise<Array<{ date: string; sent: number; delivered: number }>> {
  return demoGuard(async () => {
    return supabaseRequest<any>('v_send_timeline?select=*&order=date.asc')
  }).then((r) => r || [])
}
