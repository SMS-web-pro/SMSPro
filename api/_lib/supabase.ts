/**
 * Backend SMSPro - Serverless API
 * 
 * Architecture :
 * - Ce code tourne côté serveur (Vercel Functions ou Node)
 * - Utilise Supabase avec la SERVICE_ROLE_KEY (bypass RLS)
 * - Utilise Twilio pour l'envoi réel de SMS
 * - Expose des endpoints REST clairs
 * 
 * ⚠️ NE JAMAIS exposer ce code au navigateur
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// CLIENT SUPABASE (SERVER-SIDE)
// =====================================================

let adminClient: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase non configuré. Variables requises: VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return adminClient
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Extrait l'utilisateur authentifié du token Bearer
 */
export async function getUserFromRequest(req: any) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) return null

  const supabase = getAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null

  // Récupère le profil utilisateur
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return profile || {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
    role: data.user.user_metadata?.role || 'admin',
  }
}

/**
 * Réponse standard d'erreur
 */
export function errorResponse(res: any, status: number, message: string, details?: any) {
  return res.status(status).json({
    error: message,
    details,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Réponse standard de succès
 */
export function successResponse(res: any, data: any, meta?: any) {
  return res.status(200).json({
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  })
}

/**
 * CORS headers
 */
export function corsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * Wrapper pour gérer OPTIONS (preflight CORS)
 */
export function handleCors(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    corsHeaders(res)
    res.status(204).end()
    return true
  }
  corsHeaders(res)
  return false
}
