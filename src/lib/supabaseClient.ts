/**
 * Client Supabase + Fonctions d'authentification
 *
 * Deux sources de credentials (par ordre de priorité) :
 * 1. Variables d'environnement (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * 2. localStorage (configurée via Paramètres → Connexion Supabase)
 *
 * Le client est re-créé automatiquement si les credentials changent.
 */

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js'

// =====================================================
// SOURCES DE CREDENTIALS
// =====================================================

function getSupabaseCredentials(): { url: string; key: string; source: 'env' | 'local' | 'none' } {
  // 1. Variables d'environnement (priorité)
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || ''
  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || ''
  if (envUrl && envKey) return { url: envUrl, key: envKey, source: 'env' }

  // 2. localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('smspro-supabase-config')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.url && parsed.key) return { url: parsed.url, key: parsed.key, source: 'local' }
      }
    } catch {}
  }

  return { url: '', key: '', source: 'none' }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials()
  return Boolean(url && key)
}

export function getCurrentSupabaseConfig(): { url: string; key: string; source: string } {
  return getSupabaseCredentials()
}

// =====================================================
// CLIENT SUPABASE
// =====================================================

let supabaseClient: SupabaseClient | null = null
let supabaseClientKey = ''

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  const { url, key } = getSupabaseCredentials()
  const cacheKey = `${url}:${key.substring(0, 20)}`

  if (!supabaseClient || supabaseClientKey !== cacheKey) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'smspro-auth-token',
      },
    })
    supabaseClientKey = cacheKey
  }
  return supabaseClient
}

export function saveSupabaseConfig(url: string, key: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('smspro-supabase-config', JSON.stringify({ url, key }))
  supabaseClient = null
  supabaseClientKey = ''
}

// =====================================================
// AUTH
// =====================================================

export async function signIn(email: string, password: string): Promise<{
  success: boolean
  error?: string
  user?: { id: string; email: string; name: string; role: string }
}> {
  const client = getSupabase()
  if (!client) return { success: false, error: 'Supabase non configuré. Allez dans Paramètres → Connexion Supabase.' }
  if (!email || !password) return { success: false, error: 'Email et mot de passe requis' }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (error) {
      let msg = error.message
      if (error.message.includes('Invalid login credentials')) msg = 'Email ou mot de passe incorrect'
      else if (error.message.includes('Email not confirmed')) msg = 'Email non confirmé. Vérifiez votre boîte mail.'
      else if (error.message.includes('rate limit')) msg = 'Trop de tentatives. Réessayez dans quelques minutes.'
      else if (error.message.includes('network') || error.message.includes('fetch'))
        msg = 'Erreur réseau. Vérifiez votre connexion.'
      return { success: false, error: msg }
    }

    if (!data.user) return { success: false, error: 'Aucun utilisateur retourné' }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Utilisateur',
        role: data.user.user_metadata?.role || 'admin',
      },
    }
  } catch (err) {
    return { success: false, error: (err as Error).message || 'Erreur inconnue' }
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabase()
  if (client) {
    try {
      await client.auth.signOut()
    } catch {}
  }
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> {
  const client = getSupabase()
  if (!client) return { success: false, error: 'Supabase non configuré.' }
  if (!email || !password || !name) return { success: false, error: 'Tous les champs sont requis' }
  if (password.length < 8) return { success: false, error: 'Mot de passe min. 8 caractères' }

  try {
    const { data, error } = await client.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: { name, role: 'admin' },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
      },
    })

    if (error) {
      let msg = error.message
      if (error.message.includes('already registered')) msg = 'Cet email est déjà utilisé'
      else if (error.message.includes('Password should be')) msg = 'Mot de passe trop faible'
      return { success: false, error: msg }
    }

    if (data.user && !data.session) {
      return { success: true, needsConfirmation: true }
    }
    return { success: true, needsConfirmation: false }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export async function getSession(): Promise<Session | null> {
  const client = getSupabase()
  if (!client) return null
  try {
    const { data } = await client.auth.getSession()
    return data.session
  } catch {
    return null
  }
}

// =====================================================
// USER PROFILE
// =====================================================

export async function getCurrentUser(): Promise<any | null> {
  const client = getSupabase()
  if (!client) return null
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null

    const { data } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return data || {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0],
      role: user.user_metadata?.role || 'admin',
    }
  } catch {
    return null
  }
}

export async function fetchUserSettings(): Promise<any | null> {
  const client = getSupabase()
  if (!client) return null
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null

    const { data } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return data
  } catch {
    return null
  }
}

export async function updateUserSettings(updates: Record<string, any>): Promise<void> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase non configuré')
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await client
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
}

// =====================================================
// TWILIO WEBHOOK URL HELPER
// =====================================================

export function getTwilioWebhookUrl(): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TWILIO_WEBHOOK_URL) {
    return (import.meta as any).env.VITE_TWILIO_WEBHOOK_URL
  }
  const { url } = getSupabaseCredentials()
  if (!url) return 'https://YOUR-PROJECT.supabase.co/functions/v1/twilio-status'
  const projectRef = url.split('//')[1]?.split('.')[0] || 'YOUR-PROJECT'
  return `https://${projectRef}.supabase.co/functions/v1/twilio-status`
}
