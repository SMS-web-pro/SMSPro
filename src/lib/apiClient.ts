/**
 * Client API pour les opérations réelles
 *
 * Ce client appelle les Supabase Edge Functions pour :
 * - Envoyer de vrais SMS via Twilio
 * - Toutes les opérations DB via Supabase directement
 *
 * Architecture :
 * Frontend → Supabase (RLS sécurisé) + Edge Functions (Twilio)
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const FUNCTIONS_URL = () => {
  const url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || ''
  if (!url) {
    if (typeof window !== 'undefined') {
      const ls = localStorage.getItem('smspro-supabase-config')
      if (ls) {
        try {
          const parsed = JSON.parse(ls)
          if (parsed.url) return parsed.url
        } catch {}
      }
    }
    return ''
  }
  return url
}

/**
 * Récupère le token d'authentification actuel
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const client = getSupabase()
  if (!client) return {}
  const { data } = await client.auth.getSession()
  if (data?.session?.access_token) {
    return { Authorization: `Bearer ${data.session.access_token}` }
  }
  return {}
}

/**
 * Appelle une Supabase Edge Function
 */
async function callFunction<T>(name: string, body?: any): Promise<{ data: T | null; error: string | null }> {
  const url = FUNCTIONS_URL()
  if (!url) return { data: null, error: 'Supabase non configuré' }

  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
  }

  try {
    const response = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      return { data: null, error: data.error || `Erreur ${response.status}` }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: (err as Error).message }
  }
}

// =====================================================
// SMS - Envoi réel via Twilio
// =====================================================

export interface SendSMSResult {
  total: number
  sent: number
  failed: number
  results: Array<{
    contactId: number
    phone: string
    success: boolean
    messageSid?: string
    error?: string
  }>
}

/**
 * Envoie un SMS à un ou plusieurs contacts via Twilio
 */
export async function sendSMS(
  contactIds: number[],
  message: string,
  options?: { campaignId?: number; senderNumber?: string }
): Promise<{ data: SendSMSResult | null; error: string | null }> {
  return callFunction<SendSMSResult>('send-sms', {
    contactIds,
    message,
    campaignId: options?.campaignId,
    senderNumber: options?.senderNumber,
  })
}

// =====================================================
// CONTACTS - CRUD via Supabase
// =====================================================

export async function fetchContactsAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error: error?.message || null }
}

export async function createContactAPI(contact: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  const { data, error } = await client
    .from('contacts')
    .insert({ ...contact, user_id: user.id })
    .select()
    .single()

  return { data, error: error?.message || null }
}

export async function updateContactAPI(id: number, updates: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export async function deleteContactAPI(id: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { error } = await client.from('contacts').delete().eq('id', id)
  return { data: null, error: error?.message || null }
}

// =====================================================
// CAMPAIGNS - CRUD via Supabase
// =====================================================

export async function fetchCampaignsAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error: error?.message || null }
}

export async function createCampaignAPI(campaign: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  const { data, error } = await client
    .from('campaigns')
    .insert({ ...campaign, user_id: user.id })
    .select()
    .single()

  return { data, error: error?.message || null }
}

export async function deleteCampaignAPI(id: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { error } = await client.from('campaigns').delete().eq('id', id)
  return { data: null, error: error?.message || null }
}

// =====================================================
// AUTO-REPLY
// =====================================================

export async function fetchAutoReplyAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('auto_reply_rules')
    .select('*')
    .order('keyword')

  return { data, error: error?.message || null }
}

export async function createAutoReplyAPI(rule: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  const { data, error } = await client
    .from('auto_reply_rules')
    .insert({ ...rule, user_id: user.id, trigger_count: 0 })
    .select()
    .single()

  return { data, error: error?.message || null }
}

export async function deleteAutoReplyAPI(id: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { error } = await client.from('auto_reply_rules').delete().eq('id', id)
  return { data: null, error: error?.message || null }
}

export async function updateAutoReplyAPI(id: number, updates: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('auto_reply_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error: error?.message || null }
}

// =====================================================
// COUPONS
// =====================================================

export async function fetchCouponsAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error: error?.message || null }
}

export async function createCouponAPI(coupon: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  const { data, error } = await client
    .from('coupons')
    .insert({ ...coupon, user_id: user.id, current_uses: 0 })
    .select()
    .single()

  return { data, error: error?.message || null }
}

export async function deleteCouponAPI(id: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { error } = await client.from('coupons').delete().eq('id', id)
  return { data: null, error: error?.message || null }
}

// =====================================================
// INVITATIONS
// =====================================================

export async function fetchInvitationsAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error: error?.message || null }
}

export async function createInvitationAPI(invitation: any) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`

  const { data, error } = await client
    .from('invitations')
    .insert({
      ...invitation,
      user_id: user.id,
      unique_token: token,
      status: 'active',
      responses: [],
    })
    .select()
    .single()

  return { data, error: error?.message || null }
}

export async function deleteInvitationAPI(id: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { error } = await client.from('invitations').delete().eq('id', id)
  return { data: null, error: error?.message || null }
}

// =====================================================
// INBOX
// =====================================================

export async function fetchInboxAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('inbox_messages')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(200)

  return { data, error: error?.message || null }
}

export async function markInboxReadAPI(id: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { error } = await client
    .from('inbox_messages')
    .update({ is_read: true })
    .eq('id', id)

  return { data: null, error: error?.message || null }
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Récupère les SMS logs d'une campagne
 */
export async function fetchCampaignLogsAPI(campaignId: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('sms_logs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  return { data, error: error?.message || null }
}

/**
 * Récupère les stats d'une campagne
 */
export async function fetchCampaignStatsAPI(campaignId: number) {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data, error } = await client
    .from('campaign_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .single()

  return { data, error: error?.message || null }
}

/**
 * Stats globales du dashboard
 */
export async function fetchDashboardStatsAPI() {
  const client = getSupabase()
  if (!client) return { data: null, error: 'Supabase non configuré' }

  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  // Compter les contacts
  const { count: totalContacts } = await client
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: activeContacts } = await client
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('opted_in', true)

  // Campagnes
  const { count: totalCampaigns } = await client
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // SMS envoyés (via vue)
  const { data: stats } = await client
    .from('v_user_engagement')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return {
    data: {
      totalContacts: totalContacts || 0,
      activeContacts: activeContacts || 0,
      totalCampaigns: totalCampaigns || 0,
      totalSent: stats?.total_sms_sent || 0,
      totalDelivered: stats?.total_delivered || 0,
      totalCost: stats?.total_cost || 0,
      deliveryRate: stats?.total_sms_sent > 0
        ? Math.round((stats.total_delivered / stats.total_sms_sent) * 10000) / 100
        : 0,
    },
    error: null,
  }
}

/**
 * Vérifie que la configuration est OK
 */
export function isAPIReady(): boolean {
  return isSupabaseConfigured()
}
