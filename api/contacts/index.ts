/**
 * API : GET /api/contacts
 * Liste les contacts de l'utilisateur authentifié
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAdminClient, getUserFromRequest, errorResponse, successResponse, handleCors } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed')
  }

  try {
    const user = await getUserFromRequest(req)
    if (!user) return errorResponse(res, 401, 'Non authentifié')

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return errorResponse(res, 500, 'Erreur DB', error.message)

    return successResponse(res, data || [])
  } catch (err: any) {
    return errorResponse(res, 500, err.message || 'Erreur serveur')
  }
}
