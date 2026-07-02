export type User = {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  company_name?: string
  timezone?: string
  language?: string
  logo_url?: string
  twilio_config?: Record<string, any>
  created_at: string
  updated_at: string
}

export type Contact = {
  id: number
  user_id: string
  phone: string
  first_name?: string
  last_name?: string
  email?: string
  city?: string
  country: string
  opted_in: boolean
  opted_in_date?: string
  opted_out_date?: string
  source: string
  tags: string[]
  custom_fields?: Record<string, any>
  created_at: string
  updated_at: string
}

export type Segment = {
  id: number
  user_id: string
  name: string
  description?: string
  conditions: Record<string, any>
  contact_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'paused'

export type CampaignStats = {
  total_sent: number
  total_delivered: number
  total_failed: number
  total_pending: number
  total_read: number
  total_clicked: number
  total_cost: number
  delivery_rate: number
  read_rate: number
  click_rate: number
}

export type Campaign = {
  id: number
  user_id: string
  name: string
  message: string
  message_template?: string
  personalize?: boolean
  segment_id?: number
  status: CampaignStatus
  scheduled_at?: string
  sent_at?: string
  completed_at?: string
  stats?: CampaignStats
  created_at: string
}

export type SMSStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered'

/**
 * Engagement du destinataire avec le SMS
 * - delivered : SMS reçu par l'opérateur du destinataire (Twilio status)
 * - read : équivalent "lu" via clic sur le lien tracké
 * - clicked : clic sur un lien court
 * - replied : réponse du destinataire (ex: mot-clé)
 * - opted_out : STOP reçu
 */
export type SMSEngagement = {
  read_at?: string
  clicked_at?: string
  clicked_url?: string
  replies?: Array<{ text: string; received_at: string }>
}

export type SMSLog = {
  id: number
  campaign_id?: number
  contact_id?: number
  phone: string
  message: string
  message_sid?: string
  status: SMSStatus
  provider?: string
  error_code?: string
  error_message?: string
  cost: number
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  created_at: string
  tracking_id?: string
  engagement?: SMSEngagement
}

export type Toast = {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
}

/**
 * Règle d'auto-réponse : quand un contact répond avec un mot-clé,
 * on lui envoie automatiquement un message prédéfini.
 */
export type AutoReplyRule = {
  id: number
  user_id: string
  keyword: string
  match_type: 'exact' | 'contains' | 'starts_with'
  response_message: string
  description?: string
  trigger_count: number
  is_active: boolean
  case_sensitive: boolean
  actions?: AutoReplyAction[]
  created_at: string
  updated_at: string
}

/**
 * Actions automatiques déclenchées par une règle (union discriminée)
 */
export type AutoReplyAction =
  | { type: 'send_coupon'; coupon_code?: string; coupon_id?: number }
  | { type: 'send_invitation'; invitation_id?: number }
  | { type: 'opt_in'; value: boolean }
  | { type: 'add_tag'; tag: string }
  | { type: 'remove_tag'; tag: string }
  | { type: 'webhook'; url: string }

export type AutoReplyActionType = AutoReplyAction['type']

/**
 * Helper type guard pour les actions
 */
export const isOptInAction = (a: AutoReplyAction): a is Extract<AutoReplyAction, { type: 'opt_in' }> => a.type === 'opt_in'
export const isTagAction = (a: AutoReplyAction): a is Extract<AutoReplyAction, { type: 'add_tag' | 'remove_tag' }> => a.type === 'add_tag' || a.type === 'remove_tag'

/**
 * Coupon / Code promo associé à une campagne
 */
export type Coupon = {
  id: number
  user_id: string
  code: string
  campaign_id?: number
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'gift'
  value: number
  description?: string
  terms?: string
  valid_from: string
  valid_until: string
  max_uses?: number
  current_uses: number
  per_contact_limit: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Utilisation d'un coupon par un contact
 */
export type CouponUsage = {
  id: number
  coupon_id: number
  contact_id: number
  phone: string
  coupon_code: string
  used_at: string
  order_value?: number
  source: 'sms_campaign' | 'manual' | 'import' | 'api'
  campaign_id?: number
  created_at: string
}

/**
 * Invitation envoyée à un contact (événement, rdv, offre spéciale...)
 */
export type Invitation = {
  id: number
  user_id: string
  campaign_id?: number
  title: string
  description?: string
  type: 'event' | 'appointment' | 'offer' | 'vip' | 'reminder'
  event_date?: string
  location?: string
  unique_token: string
  max_guests: number
  response_deadline?: string
  is_rsvp: boolean
  status: 'active' | 'closed' | 'expired'
  responses: InvitationResponse[]
  created_at: string
}

/**
 * Réponse d'un contact à une invitation
 */
export type InvitationResponse = {
  id: number
  invitation_id: number
  contact_id: number
  phone: string
  response: 'accepted' | 'declined' | 'maybe' | 'pending'
  guests_count: number
  responded_at?: string
  notes?: string
}

/**
 * Conversation / Message reçu d'un contact (via SMS reply)
 */
export type InboxMessage = {
  id: number
  user_id: string
  contact_id?: number
  phone: string
  direction: 'inbound' | 'outbound'
  message: string
  keyword_detected?: string
  auto_reply_sent?: boolean
  rule_triggered_id?: number
  received_at: string
  is_read: boolean
}
