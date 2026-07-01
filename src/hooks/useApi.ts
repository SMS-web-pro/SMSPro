/**
 * Hooks React pour charger les données depuis l'API réelle
 * (Supabase + Twilio)
 *
 * Chaque hook :
 * - Charge automatiquement au mount
 * - Fournit un état loading + error
 * - Expose une fonction refresh() pour recharger
 *
 * En mode démo, retourne les données du store Zustand.
 * En mode production, appelle Supabase.
 */

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import {
  fetchContactsAPI,
  fetchCampaignsAPI,
  fetchAutoReplyAPI,
  fetchCouponsAPI,
  fetchInvitationsAPI,
  fetchInboxAPI,
  fetchDashboardStatsAPI,
  createContactAPI,
  createCampaignAPI,
  createAutoReplyAPI,
  createCouponAPI,
  createInvitationAPI,
  deleteContactAPI,
  deleteCampaignAPI,
  deleteAutoReplyAPI,
  updateAutoReplyAPI,
  deleteCouponAPI,
  deleteInvitationAPI,
  updateContactAPI,
  markInboxReadAPI,
  sendSMS,
} from '@/lib/apiClient'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook générique pour fetcher une ressource
 */
function useFetch<T>(
  fetchFn: () => Promise<{ data: T | null; error: string | null }>,
  deps: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (result.error) setError(result.error)
      setData(result.data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}

// =====================================================
// HOOKS SPÉCIFIQUES
// =====================================================

export function useContacts() {
  const isDemo = useStore((s) => s.isDemo)
  const demoContacts = useStore((s) => s.contacts)

  const fetcher = useCallback(async () => {
    if (isDemo) return { data: demoContacts, error: null }
    return fetchContactsAPI()
  }, [isDemo, demoContacts])

  return useFetch(fetcher, [isDemo])
}

export function useCampaigns() {
  const isDemo = useStore((s) => s.isDemo)
  const demoCampaigns = useStore((s) => s.campaigns)

  const fetcher = useCallback(async () => {
    if (isDemo) return { data: demoCampaigns, error: null }
    return fetchCampaignsAPI()
  }, [isDemo, demoCampaigns])

  return useFetch(fetcher, [isDemo])
}

export function useAutoReplyRules() {
  const isDemo = useStore((s) => s.isDemo)
  const demoRules = useStore((s) => s.autoReplyRules)

  const fetcher = useCallback(async () => {
    if (isDemo) return { data: demoRules, error: null }
    return fetchAutoReplyAPI()
  }, [isDemo, demoRules])

  return useFetch(fetcher, [isDemo])
}

export function useCoupons() {
  const isDemo = useStore((s) => s.isDemo)
  const demoCoupons = useStore((s) => s.coupons)

  const fetcher = useCallback(async () => {
    if (isDemo) return { data: demoCoupons, error: null }
    return fetchCouponsAPI()
  }, [isDemo, demoCoupons])

  return useFetch(fetcher, [isDemo])
}

export function useInvitations() {
  const isDemo = useStore((s) => s.isDemo)
  const demoInvitations = useStore((s) => s.invitations)

  const fetcher = useCallback(async () => {
    if (isDemo) return { data: demoInvitations, error: null }
    return fetchInvitationsAPI()
  }, [isDemo, demoInvitations])

  return useFetch(fetcher, [isDemo])
}

export function useInbox() {
  const isDemo = useStore((s) => s.isDemo)
  const demoInbox = useStore((s) => s.inboxMessages)

  const fetcher = useCallback(async () => {
    if (isDemo) return { data: demoInbox, error: null }
    return fetchInboxAPI()
  }, [isDemo, demoInbox])

  return useFetch(fetcher, [isDemo])
}

export function useDashboardStats() {
  const isDemo = useStore((s) => s.isDemo)
  const demoContacts = useStore((s) => s.contacts)
  const demoCampaigns = useStore((s) => s.campaigns)

  const fetcher = useCallback(async () => {
    if (isDemo) {
      const totalContacts = demoContacts.length
      const activeContacts = demoContacts.filter((c) => c.opted_in).length
      const totalCampaigns = demoCampaigns.length
      const allStats = demoCampaigns.filter((c) => c.stats).map((c) => c.stats!)
      const totalSent = allStats.reduce((s, x) => s + x.total_sent, 0)
      const totalDelivered = allStats.reduce((s, x) => s + x.total_delivered, 0)
      const totalCost = allStats.reduce((s, x) => s + x.total_cost, 0)
      const deliveryRate = totalSent > 0
        ? Math.round((totalDelivered / totalSent) * 10000) / 100
        : 0
      return {
        data: { totalContacts, activeContacts, totalCampaigns, totalSent, totalDelivered, totalCost, deliveryRate },
        error: null,
      }
    }
    return fetchDashboardStatsAPI()
  }, [isDemo, demoContacts, demoCampaigns])

  return useFetch(fetcher, [isDemo])
}

// =====================================================
// MUTATIONS
// =====================================================

export function useContactMutations() {
  const isDemo = useStore((s) => s.isDemo)
  const demoAdd = useStore((s) => s.addContact)
  const demoUpdate = useStore((s) => s.updateContact)
  const demoDelete = useStore((s) => s.deleteContact)
  const addToast = useStore((s) => s.addToast)

  return {
    create: async (contact: any) => {
      if (isDemo) {
        demoAdd(contact)
        addToast({ type: 'success', title: 'Contact ajouté (démo)' })
        return { data: contact, error: null }
      }
      const result = await createContactAPI(contact)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Contact ajouté' })
      return result
    },
    update: async (id: number, updates: any) => {
      if (isDemo) {
        demoUpdate(id, updates)
        addToast({ type: 'success', title: 'Contact modifié (démo)' })
        return { data: updates, error: null }
      }
      const result = await updateContactAPI(id, updates)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Contact modifié' })
      return result
    },
    remove: async (id: number) => {
      if (isDemo) {
        demoDelete(id)
        addToast({ type: 'success', title: 'Contact supprimé (démo)' })
        return { data: null, error: null }
      }
      const result = await deleteContactAPI(id)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Contact supprimé' })
      return result
    },
  }
}

export function useCampaignMutations() {
  const isDemo = useStore((s) => s.isDemo)
  const addCampaign = useStore((s) => s.addCampaign)
  const deleteCampaign = useStore((s) => s.deleteCampaign)
  const sendCampaign = useStore((s) => s.sendCampaign)
  const addToast = useStore((s) => s.addToast)

  return {
    create: async (campaign: any) => {
      if (isDemo) {
        addCampaign(campaign)
        addToast({ type: 'success', title: 'Campagne créée (démo)' })
        return { data: campaign, error: null }
      }
      const result = await createCampaignAPI(campaign)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Campagne créée' })
      return result
    },
    remove: async (id: number) => {
      if (isDemo) {
        deleteCampaign(id)
        return { data: null, error: null }
      }
      return deleteCampaignAPI(id)
    },
    send: async (id: number) => {
      if (isDemo) {
        await sendCampaign(id)
        addToast({ type: 'success', title: 'Campagne envoyée (simulation démo)' })
        return { data: null, error: null }
      }
      // En production, l'envoi passe par la page de campagne qui collecte les contactIds
      // Ici on simule juste le trigger
      addToast({ type: 'info', title: 'Utilisez la page de campagne pour envoyer' })
      return { data: null, error: null }
    },
  }
}

export function useAutoReplyMutations() {
  const isDemo = useStore((s) => s.isDemo)
  const demoAdd = useStore((s) => s.addAutoReplyRule)
  const demoUpdate = useStore((s) => s.updateAutoReplyRule)
  const demoDelete = useStore((s) => s.deleteAutoReplyRule)
  const addToast = useStore((s) => s.addToast)

  return {
    create: async (rule: any) => {
      if (isDemo) {
        demoAdd(rule)
        addToast({ type: 'success', title: 'Règle créée (démo)' })
        return { data: rule, error: null }
      }
      const result = await createAutoReplyAPI(rule)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Règle créée' })
      return result
    },
    update: async (id: number, updates: any) => {
      if (isDemo) {
        demoUpdate(id, updates)
        return { data: updates, error: null }
      }
      const result = await updateAutoReplyAPI(id, updates)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Règle mise à jour' })
      return result
    },
    remove: async (id: number) => {
      if (isDemo) {
        demoDelete(id)
        return { data: null, error: null }
      }
      const result = await deleteAutoReplyAPI(id)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Règle supprimée' })
      return result
    },
  }
}

export function useCouponMutations() {
  const isDemo = useStore((s) => s.isDemo)
  const demoAdd = useStore((s) => s.addCoupon)
  const demoDelete = useStore((s) => s.deleteCoupon)
  const addToast = useStore((s) => s.addToast)

  return {
    create: async (coupon: any) => {
      if (isDemo) {
        const c = demoAdd(coupon)
        addToast({ type: 'success', title: 'Coupon créé (démo)' })
        return { data: c, error: null }
      }
      const result = await createCouponAPI(coupon)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Coupon créé' })
      return result
    },
    remove: async (id: number) => {
      if (isDemo) {
        demoDelete(id)
        return { data: null, error: null }
      }
      return deleteCouponAPI(id)
    },
  }
}

export function useInvitationMutations() {
  const isDemo = useStore((s) => s.isDemo)
  const demoAdd = useStore((s) => s.addInvitation)
  const demoDelete = useStore((s) => s.deleteInvitation)
  const addToast = useStore((s) => s.addToast)

  return {
    create: async (invitation: any) => {
      if (isDemo) {
        const i = demoAdd(invitation)
        addToast({ type: 'success', title: 'Invitation créée (démo)' })
        return { data: i, error: null }
      }
      const result = await createInvitationAPI(invitation)
      if (result.error) addToast({ type: 'error', title: 'Erreur', description: result.error })
      else addToast({ type: 'success', title: 'Invitation créée' })
      return result
    },
    remove: async (id: number) => {
      if (isDemo) {
        demoDelete(id)
        return { data: null, error: null }
      }
      return deleteInvitationAPI(id)
    },
  }
}

export function useInboxMutations() {
  const isDemo = useStore((s) => s.isDemo)
  const demoMark = useStore((s) => s.markInboxRead)
  const demoMarkAll = useStore((s) => s.markAllInboxRead)

  return {
    markRead: async (id: number) => {
      if (isDemo) {
        demoMark(id)
        return { data: null, error: null }
      }
      return markInboxReadAPI(id)
    },
    markAllRead: () => {
      if (isDemo) demoMarkAll()
    },
  }
}

// =====================================================
// ENVOI SMS RÉEL VIA TWILIO
// =====================================================

export function useSendSMS() {
  const addToast = useStore((s) => s.addToast)
  const isDemo = useStore((s) => s.isDemo)

  return async (contactIds: number[], message: string, options?: { campaignId?: number; senderNumber?: string }) => {
    if (isDemo) {
      // En mode démo, on simule juste
      addToast({
        type: 'info',
        title: '📨 Simulation',
        description: `${contactIds.length} SMS auraient été envoyés (mode démo)`,
      })
      return { data: { total: contactIds.length, sent: contactIds.length, failed: 0, results: [] }, error: null }
    }

    addToast({ type: 'info', title: 'Envoi en cours...', description: `${contactIds.length} destinataires` })
    const result = await sendSMS(contactIds, message, options)

    if (result.error) {
      addToast({ type: 'error', title: 'Erreur d\'envoi', description: result.error })
    } else if (result.data) {
      if (result.data.failed > 0 && result.data.sent === 0) {
        const firstError = result.data.results?.find((r: any) => r.error)?.error || 'Échoué'
        const hint = firstError.includes('unverified')
          ? ' Compte Twilio trial : vérifiez le numéro dans Twilio Console.'
          : firstError.includes('Telnyx')
          ? ' Vérifiez votre API Key et numéro dans Paramètres → SMS.'
          : ''
        addToast({
          type: 'error',
          title: 'Échec d\'envoi',
          description: `${result.data.failed} SMS échoué(s).${hint}`,
        })
      } else if (result.data.failed > 0) {
        addToast({
          type: 'warning',
          title: 'Envoi partiel',
          description: `✓ ${result.data.sent} envoyés · ✗ ${result.data.failed} échoués`,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Campagne envoyée',
          description: `✓ ${result.data.sent} SMS envoyés avec succès`,
        })
      }
    }
    return result
  }
}
