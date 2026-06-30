/**
 * Segments prédéfinis proposés aux nouveaux utilisateurs
 * Note : en production, ce fichier n'est plus nécessaire car
 * les segments sont créés dans Supabase via le seed SQL.
 *
 * Conservé pour rétrocompatibilité avec le composant NewCampaign.
 */

import type { Segment } from '@/types'

export const mockSegments: Segment[] = [
  {
    id: 1,
    user_id: '',
    name: 'Tous les contacts actifs',
    description: 'Contacts ayant donné leur consentement',
    conditions: { opted_in: true },
    contact_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: '',
    name: 'Contacts Bruxelles',
    description: 'Contacts résidant à Bruxelles',
    conditions: { opted_in: true, city: 'Bruxelles' },
    contact_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    user_id: '',
    name: 'Clients VIP',
    description: 'Contacts taggés comme VIP',
    conditions: { opted_in: true, tags: ['VIP'] },
    contact_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    user_id: '',
    name: 'Nouveaux inscrits',
    description: 'Contacts ajoutés dans les 30 derniers jours',
    conditions: { opted_in: true, date_range: '30d' },
    contact_count: 0,
    created_at: new Date().toISOString(),
  },
]

/**
 * Génère une timeline vide (utilisée par le dashboard en démo)
 */
export function generateTimelineData(): Array<{ date: string; sent: number; delivered: number }> {
  const result: Array<{ date: string; sent: number; delivered: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    result.push({
      date: date.toISOString().split('T')[0],
      sent: 0,
      delivered: 0,
    })
  }
  return result
}
