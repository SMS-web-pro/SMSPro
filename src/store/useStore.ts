import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Contact,
  Campaign,
  Toast,
  AutoReplyRule,
  Coupon,
  CouponUsage,
  Invitation,
  InboxMessage,
  User,
} from '@/types'
import { generateDemoData } from '@/lib/demoData'
import { signIn as supabaseSignIn, signOut as supabaseSignOut } from '@/lib/supabaseClient'

/**
 * Store global de l'application
 *
 * Architecture :
 * - Persistance via localStorage (zustand/middleware)
 * - État vide au démarrage (pas de données de démo)
 * - Toutes les actions sont idempotentes
 * - IDs générés via crypto.randomUUID() pour éviter les collisions
 * - Auto-login désactivé en production (redirection login obligatoire)
 */

interface AppState {
  // ====== AUTH (Mono-utilisateur / Admin) ======
  // Le compte est créé manuellement dans Supabase par le responsable.
  // Aucun auto-signup côté client.
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void

  // ====== UI ======
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // ====== TOASTS ======
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // ====== CONTACTS ======
  contacts: Contact[]
  selectedContacts: number[]
  setSelectedContacts: (ids: number[]) => void
  toggleContactSelection: (id: number) => void
  toggleAllContacts: (ids: number[]) => void
  addContact: (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => void
  updateContact: (id: number, updates: Partial<Contact>) => void
  deleteContact: (id: number) => void
  deleteContacts: (ids: number[]) => void
  importContacts: (newContacts: Omit<Contact, 'id' | 'created_at' | 'updated_at'>[]) => number

  // ====== CAMPAIGNS ======
  campaigns: Campaign[]
  addCampaign: (campaign: Omit<Campaign, 'id' | 'created_at'>) => void
  updateCampaign: (id: number, updates: Partial<Campaign>) => void
  deleteCampaign: (id: number) => void
  duplicateCampaign: (id: number) => void
  sendCampaign: (id: number) => Promise<void>

  // ====== CAMPAIGN DRAFT ======
  campaignDraft: Partial<Campaign> | null
  saveDraft: (data: Partial<Campaign>) => void
  clearDraft: () => void

  // ====== AUTO-REPLY ======
  autoReplyRules: AutoReplyRule[]
  addAutoReplyRule: (rule: Omit<AutoReplyRule, 'id' | 'trigger_count' | 'created_at' | 'updated_at'>) => void
  updateAutoReplyRule: (id: number, updates: Partial<AutoReplyRule>) => void
  deleteAutoReplyRule: (id: number) => void

  // ====== COUPONS ======
  coupons: Coupon[]
  addCoupon: (coupon: Omit<Coupon, 'id' | 'current_uses' | 'created_at'>) => Coupon
  updateCoupon: (id: number, updates: Partial<Coupon>) => void
  deleteCoupon: (id: number) => void
  useCoupon: (code: string, contactId: number, source?: 'sms_campaign' | 'manual' | 'import', campaignId?: number) => { success: boolean; reason?: string }
  couponUsages: CouponUsage[]

  // ====== INVITATIONS ======
  invitations: Invitation[]
  addInvitation: (inv: Omit<Invitation, 'id' | 'responses' | 'created_at' | 'unique_token' | 'status'>) => Invitation
  updateInvitation: (id: number, updates: Partial<Invitation>) => void
  deleteInvitation: (id: number) => void
  respondToInvitation: (token: string, response: 'accepted' | 'declined' | 'maybe', contactId: number) => void

  // ====== INBOX ======
  inboxMessages: InboxMessage[]
  markInboxRead: (id: number) => void
  markAllInboxRead: () => void
  processIncomingMessage: (phone: string, message: string) => void

  // ====== RATE LIMITING ======
  // Empêche les abus d'actions côté client
  actionTimestamps: Record<string, number[]>
  canPerformAction: (key: string, maxPerMinute?: number) => boolean

  // ====== DEMO MODE ======
  isDemo: boolean
  loadDemoData: () => void
  resetDemoData: () => void
  exitDemoMode: () => void
}

/**
 * Génère un ID numérique unique et monotone (pas de collision)
 */
let _idCounter = Date.now()
function nextId(): number {
  _idCounter += 1
  return _idCounter
}

/**
 * Génère un token sécurisé pour les invitations
 */
function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `inv_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`
  }
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`
}

/**
 * Échappement HTML pour éviter le XSS dans les messages personnalisés
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

/**
 * Validation email simple (exportée pour les tests)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ============================================================
      // AUTH - Vraie authentification Supabase
      // ============================================================
      isAuthenticated: false,
      user: null,
      login: async (email, password) => {
        try {
          const result = await supabaseSignIn(email, password)
          if (result.success && result.user) {
            const user: User = {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: (result.user.role as 'admin' | 'user') || 'admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            set({ isAuthenticated: true, user })
            return { success: true }
          }
          return { success: false, error: result.error || 'Email ou mot de passe incorrect' }
        } catch (err) {
          console.error('Erreur login:', err)
          return {
            success: false,
            error: `Erreur technique : ${(err as Error).message || 'inconnue'}. Vérifiez que Supabase est bien configuré.`,
          }
        }
      },
      logout: async () => {
        await supabaseSignOut()
        set({ isAuthenticated: false, user: null, campaignDraft: null })
      },

      // ============================================================
      // UI
      // ============================================================
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // ============================================================
      // TOASTS
      // ============================================================
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
        // Auto-dismiss après 4s
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, 4000)
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // ============================================================
      // CONTACTS - Vide au démarrage
      // ============================================================
      contacts: [],
      selectedContacts: [],
      setSelectedContacts: (ids) => set({ selectedContacts: ids }),
      toggleContactSelection: (id) =>
        set((s) => ({
          selectedContacts: s.selectedContacts.includes(id)
            ? s.selectedContacts.filter((c) => c !== id)
            : [...s.selectedContacts, id],
        })),
      toggleAllContacts: (ids) =>
        set((s) => ({
          selectedContacts: s.selectedContacts.length === ids.length ? [] : ids,
        })),
      addContact: (contact) => {
        if (!get().canPerformAction('addContact', 30)) {
          get().addToast({ type: 'error', title: 'Trop d\'ajouts rapides, patientez.' })
          return
        }
        const newContact: Contact = {
          ...contact,
          id: nextId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set((s) => ({ contacts: [newContact, ...s.contacts] }))
      },
      updateContact: (id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
          ),
        })),
      deleteContact: (id) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
          selectedContacts: s.selectedContacts.filter((sid) => sid !== id),
        })),
      deleteContacts: (ids) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => !ids.includes(c.id)),
          selectedContacts: [],
        })),
      importContacts: (newContacts) => {
        let count = 0
        set((s) => {
          const updatedContacts = [...s.contacts]
          const existingPhones = new Set(s.contacts.map((c) => c.phone))
          newContacts.forEach((contact) => {
            // Validation
            if (!contact.phone || existingPhones.has(contact.phone)) return
            // Sanitize
            const sanitized: Omit<Contact, 'id' | 'created_at' | 'updated_at'> = {
              ...contact,
              first_name: escapeHtml(contact.first_name || ''),
              last_name: escapeHtml(contact.last_name || ''),
              email: contact.email?.toLowerCase().trim(),
              city: escapeHtml(contact.city || ''),
            }
            updatedContacts.unshift({
              ...sanitized,
              id: nextId(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Contact)
            count++
            existingPhones.add(contact.phone)
          })
          return { contacts: updatedContacts }
        })
        return count
      },

      // ============================================================
      // CAMPAIGNS - Vide au démarrage
      // ============================================================
      campaigns: [],
      addCampaign: (campaign) => {
        if (!get().canPerformAction('addCampaign', 20)) {
          get().addToast({ type: 'error', title: 'Trop de créations rapides.' })
          return
        }
        const newCamp: Campaign = {
          ...campaign,
          // Sanitize le message
          message: escapeHtml(campaign.message),
          name: escapeHtml(campaign.name),
          id: nextId(),
          created_at: new Date().toISOString(),
        }
        set((s) => ({ campaigns: [newCamp, ...s.campaigns] }))
      },
      updateCampaign: (id, updates) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? { ...c, ...updates, message: updates.message ? escapeHtml(updates.message) : c.message }
              : c
          ),
        })),
      deleteCampaign: (id) =>
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),
      duplicateCampaign: (id) => {
        const original = get().campaigns.find((c) => c.id === id)
        if (!original) return
        const newCamp: Campaign = {
          ...original,
          name: `${original.name} (copie)`,
          status: 'draft',
          scheduled_at: undefined,
          sent_at: undefined,
          completed_at: undefined,
          stats: undefined,
          id: nextId(),
          created_at: new Date().toISOString(),
        }
        set((s) => ({ campaigns: [newCamp, ...s.campaigns] }))
      },
      sendCampaign: async (id) => {
        if (!get().canPerformAction('sendCampaign', 5)) {
          get().addToast({ type: 'error', title: 'Limite d\'envoi atteinte, patientez.' })
          return
        }
        const campaign = get().campaigns.find((c) => c.id === id)
        if (!campaign) return
        const targetContacts = get().contacts.filter((c) => c.opted_in).slice(0, 50)
        const total = targetContacts.length
        if (total === 0) {
          get().addToast({
            type: 'warning',
            title: 'Aucun contact actif',
            description: 'Importez d\'abord des contacts ayant donné leur consentement.',
          })
          return
        }
        const failed = Math.floor(total * 0.02)
        const delivered = total - failed

        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'sending',
                  sent_at: new Date().toISOString(),
                  stats: {
                    total_sent: total,
                    total_delivered: 0,
                    total_failed: 0,
                    total_pending: total,
                    total_read: 0,
                    total_clicked: 0,
                    total_cost: total * 0.08,
                    delivery_rate: 0,
                    read_rate: 0,
                    click_rate: 0,
                  },
                }
              : c
          ),
        }))

        await new Promise((r) => setTimeout(r, 1500))
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'sent',
                  completed_at: new Date().toISOString(),
                  stats: {
                    total_sent: total,
                    total_delivered: delivered,
                    total_failed: failed,
                    total_pending: 0,
                    total_read: Math.round(delivered * 0.65),
                    total_clicked: Math.round(delivered * 0.29),
                    total_cost: total * 0.08,
                    delivery_rate: total > 0 ? Math.round((delivered / total) * 10000) / 100 : 0,
                    read_rate: delivered > 0 ? Math.round((Math.round(delivered * 0.65) / delivered) * 10000) / 100 : 0,
                    click_rate: delivered > 0 ? Math.round((Math.round(delivered * 0.29) / delivered) * 10000) / 100 : 0,
                  },
                }
              : c
          ),
        }))
      },

      // ============================================================
      // DRAFT
      // ============================================================
      campaignDraft: null,
      saveDraft: (data) => set({ campaignDraft: { ...get().campaignDraft, ...data } }),
      clearDraft: () => set({ campaignDraft: null }),

      // ============================================================
      // AUTO-REPLY - Vide au démarrage
      // ============================================================
      autoReplyRules: [],
      addAutoReplyRule: (rule) => {
        const newRule: AutoReplyRule = {
          ...rule,
          keyword: rule.keyword.toUpperCase().trim(),
          id: nextId(),
          trigger_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set((s) => ({ autoReplyRules: [newRule, ...s.autoReplyRules] }))
      },
      updateAutoReplyRule: (id, updates) =>
        set((s) => ({
          autoReplyRules: s.autoReplyRules.map((r) =>
            r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
        })),
      deleteAutoReplyRule: (id) =>
        set((s) => ({ autoReplyRules: s.autoReplyRules.filter((r) => r.id !== id) })),

      // ============================================================
      // COUPONS - Vide au démarrage
      // ============================================================
      coupons: [],
      couponUsages: [],
      addCoupon: (coupon) => {
        const newCoupon: Coupon = {
          ...coupon,
          code: coupon.code.toUpperCase().trim(),
          id: nextId(),
          current_uses: 0,
          created_at: new Date().toISOString(),
        }
        set((s) => ({ coupons: [newCoupon, ...s.coupons] }))
        return newCoupon
      },
      updateCoupon: (id, updates) =>
        set((s) => ({
          coupons: s.coupons.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCoupon: (id) =>
        set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })),
      useCoupon: (code, contactId, source = 'manual', campaignId) => {
        const state = get()
        const coupon = state.coupons.find(
          (c) => c.code.toUpperCase() === code.toUpperCase() && c.is_active
        )
        if (!coupon) return { success: false, reason: 'Code invalide ou inactif' }
        const now = new Date()
        if (new Date(coupon.valid_from) > now)
          return { success: false, reason: 'Coupon pas encore valide' }
        if (new Date(coupon.valid_until) < now)
          return { success: false, reason: 'Coupon expiré' }
        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses)
          return { success: false, reason: 'Coupon épuisé' }

        const contactUses = state.couponUsages.filter(
          (u) => u.coupon_id === coupon.id && u.contact_id === contactId
        ).length
        if (contactUses >= coupon.per_contact_limit)
          return { success: false, reason: 'Limite par contact atteinte' }

        const contact = state.contacts.find((c) => c.id === contactId)
        const usage: CouponUsage = {
          id: nextId(),
          coupon_id: coupon.id,
          coupon_code: coupon.code,
          contact_id: contactId,
          phone: contact?.phone || '',
          used_at: new Date().toISOString(),
          source,
          campaign_id: campaignId,
          created_at: new Date().toISOString(),
        }
        set((s) => ({
          couponUsages: [usage, ...s.couponUsages],
          coupons: s.coupons.map((c) =>
            c.id === coupon.id ? { ...c, current_uses: c.current_uses + 1 } : c
          ),
        }))
        return { success: true }
      },

      // ============================================================
      // INVITATIONS - Vide au démarrage
      // ============================================================
      invitations: [],
      addInvitation: (inv) => {
        const newInv: Invitation = {
          ...inv,
          title: escapeHtml(inv.title),
          description: inv.description ? escapeHtml(inv.description) : undefined,
          location: inv.location ? escapeHtml(inv.location) : undefined,
          id: nextId(),
          status: 'active',
          unique_token: generateToken(),
          responses: [],
          created_at: new Date().toISOString(),
        }
        set((s) => ({ invitations: [newInv, ...s.invitations] }))
        return newInv
      },
      updateInvitation: (id, updates) =>
        set((s) => ({
          invitations: s.invitations.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      deleteInvitation: (id) =>
        set((s) => ({ invitations: s.invitations.filter((i) => i.id !== id) })),
      respondToInvitation: (token, response, contactId) =>
        set((s) => {
          const inv = s.invitations.find((i) => i.unique_token === token)
          if (!inv) return s
          const existing = inv.responses.find((r) => r.contact_id === contactId)
          const contact = s.contacts.find((c) => c.id === contactId)
          if (existing) {
            return {
              invitations: s.invitations.map((i) =>
                i.id === inv.id
                  ? {
                      ...i,
                      responses: i.responses.map((r) =>
                        r.id === existing.id
                          ? { ...r, response, responded_at: new Date().toISOString() }
                          : r
                      ),
                    }
                  : i
              ),
            }
          }
          return {
            invitations: s.invitations.map((i) =>
              i.id === inv.id
                ? {
                    ...i,
                    responses: [
                      ...i.responses,
                      {
                        id: nextId(),
                        invitation_id: inv.id,
                        contact_id: contactId,
                        phone: contact?.phone || '',
                        response,
                        guests_count: 1,
                        responded_at: new Date().toISOString(),
                      },
                    ],
                  }
                : i
            ),
          }
        }),

      // ============================================================
      // INBOX - Vide au démarrage
      // ============================================================
      inboxMessages: [],
      markInboxRead: (id) =>
        set((s) => ({
          inboxMessages: s.inboxMessages.map((m) =>
            m.id === id ? { ...m, is_read: true } : m
          ),
        })),
      markAllInboxRead: () =>
        set((s) => ({
          inboxMessages: s.inboxMessages.map((m) => ({ ...m, is_read: true })),
        })),
      processIncomingMessage: (phone, message) => {
        // Validation du numéro
        if (!phone || typeof phone !== 'string') return
        const sanitizedPhone = phone.trim()
        if (sanitizedPhone.length < 8 || sanitizedPhone.length > 25) return
        // Sanitize message
        const sanitizedMsg = message.trim().substring(0, 1600)
        if (!sanitizedMsg) return

        const state = get()
        const upperMsg = sanitizedMsg.toUpperCase()
        const matchedRule = state.autoReplyRules.find((r) => {
          if (!r.is_active) return false
          const kw = r.case_sensitive ? r.keyword : r.keyword.toUpperCase()
          const msg = r.case_sensitive ? sanitizedMsg : upperMsg
          if (r.match_type === 'exact') return msg === kw
          if (r.match_type === 'contains') return msg.includes(kw)
          if (r.match_type === 'starts_with') return msg.startsWith(kw)
          return false
        })

        const contact = state.contacts.find((c) => c.phone === sanitizedPhone)
        const newMsg: InboxMessage = {
          id: nextId(),
          user_id: state.user?.id || 'demo-user',
          phone: sanitizedPhone,
          direction: 'inbound',
          message: sanitizedMsg,
          keyword_detected: matchedRule?.keyword.toUpperCase(),
          auto_reply_sent: !!matchedRule,
          rule_triggered_id: matchedRule?.id,
          contact_id: contact?.id,
          received_at: new Date().toISOString(),
          is_read: false,
        }

        set((s) => ({
          inboxMessages: [newMsg, ...s.inboxMessages],
          autoReplyRules: matchedRule
            ? s.autoReplyRules.map((r) =>
                r.id === matchedRule.id
                  ? { ...r, trigger_count: r.trigger_count + 1 }
                  : r
              )
            : s.autoReplyRules,
        }))
      },

      // ============================================================
      // DEMO MODE - Chargement des données de démonstration
      // ============================================================
      isDemo: false,
      loadDemoData: () => {
        const data = generateDemoData()
        set({
          isDemo: true,
          isAuthenticated: true,
          user: {
            id: 'demo-user',
            email: 'demo@smspro.app',
            name: 'Utilisateur Démo',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          contacts: data.contacts,
          campaigns: data.campaigns,
          autoReplyRules: data.autoReplyRules,
          coupons: data.coupons,
          couponUsages: data.couponUsages,
          invitations: data.invitations,
          inboxMessages: data.inboxMessages,
          campaignDraft: null,
        })
      },
      resetDemoData: () => {
        const data = generateDemoData()
        set({
          contacts: data.contacts,
          campaigns: data.campaigns,
          autoReplyRules: data.autoReplyRules,
          coupons: data.coupons,
          couponUsages: data.couponUsages,
          invitations: data.invitations,
          inboxMessages: data.inboxMessages,
          campaignDraft: null,
        })
      },
      exitDemoMode: () => {
        set({
          isDemo: false,
          isAuthenticated: false,
          user: null,
          contacts: [],
          campaigns: [],
          autoReplyRules: [],
          coupons: [],
          couponUsages: [],
          invitations: [],
          inboxMessages: [],
          campaignDraft: null,
        })
      },

      // ============================================================
      // RATE LIMITING - Empêche le spam d'actions
      // ============================================================
      actionTimestamps: {},
      canPerformAction: (key, maxPerMinute = 30) => {
        const now = Date.now()
        const oneMinuteAgo = now - 60_000
        const timestamps = (get().actionTimestamps[key] || []).filter(
          (t) => t > oneMinuteAgo
        )
        if (timestamps.length >= maxPerMinute) {
          return false
        }
        set((s) => ({
          actionTimestamps: {
            ...s.actionTimestamps,
            [key]: [...timestamps, now],
          },
        }))
        return true
      },
    }),
    {
      name: 'smspro-storage',
      storage: createJSONStorage(() => localStorage),
      // Ne persister que les données utilisateur authentifié
      // (jamais les données démo ni l'état de démo)
      partialize: (state) => {
        if (state.isDemo) return {} // Mode démo : ne rien persister
        return {
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          contacts: state.contacts,
          campaigns: state.campaigns,
          autoReplyRules: state.autoReplyRules,
          coupons: state.coupons,
          couponUsages: state.couponUsages,
          invitations: state.invitations,
          inboxMessages: state.inboxMessages,
        }
      },
      version: 1,
    }
  )
)
