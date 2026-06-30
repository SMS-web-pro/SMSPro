/**
 * Données de démonstration pour le mode démo
 *
 * ATTENTION : Ces données ne sont JAMAIS chargées en mode production.
 * Elles sont uniquement injectées dans le store quand l'utilisateur
 * clique sur "Voir la démo" depuis la page de login.
 *
 * En mode production (compte normal), le store démarre vide.
 */

import type {
  Contact,
  Campaign,
  AutoReplyRule,
  Coupon,
  CouponUsage,
  Invitation,
  InboxMessage,
  SMSLog,
} from '@/types'

let _id = 1
const id = () => _id++

const firstNames = [
  'Lucas', 'Emma', 'Hugo', 'Léa', 'Louis', 'Manon', 'Nathan', 'Camille',
  'Léo', 'Juliette', 'Arthur', 'Sarah', 'Tom', 'Alice', 'Noah', 'Chloé',
  'Maxime', 'Lola', 'Ethan', 'Inès', 'Antoine', 'Yasmine', 'Romain', 'Eva',
  'Théo',
]
const lastNames = [
  'Dubois', 'Lambert', 'Peeters', 'Janssens', 'Martin', 'Bernard', 'Petit',
  'Robert', 'Richard', 'Durand', 'Moreau', 'Laurent', 'Simon', 'Michel',
  'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier',
  'Girard', 'Bonnet', 'Dupuis', 'Fontaine',
]
const cities = [
  'Bruxelles', 'Anvers', 'Gand', 'Charleroi', 'Liège', 'Bruges', 'Namur',
  'Louvain', 'Mons', 'Alost', 'Malines', 'Ostende',
]
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function phoneNumber(): string {
  const prefixes = ['470', '471', '472', '473', '474', '475', '476', '477', '478', '479', '485', '486']
  const num = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `+32${pick(prefixes)}${num}`
}
function daysAgo(d: number): string {
  const date = new Date()
  date.setDate(date.getDate() - d)
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  return date.toISOString()
}

/**
 * Génère le jeu complet de données de démo
 */
export function generateDemoData() {
  _id = 1 // Reset counter

  // === Contacts (25) ===
  const contacts: Contact[] = []
  for (let i = 0; i < 25; i++) {
    const firstName = pick(firstNames)
    const lastName = pick(lastNames)
    const optedIn = Math.random() > 0.12
    const contactTags: string[] = []
    if (Math.random() > 0.7) contactTags.push('VIP')
    if (Math.random() > 0.5) contactTags.push('Newsletter')

    contacts.push({
      id: id(),
      user_id: 'demo-user',
      phone: phoneNumber(),
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      city: pick(cities),
      country: 'BE',
      opted_in: optedIn,
      opted_in_date: optedIn ? daysAgo(90) : undefined,
      opted_out_date: !optedIn ? daysAgo(30) : undefined,
      source: pick(['manual', 'import', 'signup', 'api']),
      tags: contactTags,
      created_at: daysAgo(120),
      updated_at: daysAgo(30),
    })
  }

  // === Campagnes (4) ===
  const campaigns: Campaign[] = [
    {
      id: id(),
      user_id: 'demo-user',
      name: 'Black Friday 2024',
      message: '🔥 Black Friday ! Profitez de -25% sur tout avec le code BLACK25. Offre valable jusqu\'à dimanche minuit.',
      segment_id: 1,
      status: 'sent',
      scheduled_at: undefined,
      sent_at: daysAgo(5),
      completed_at: daysAgo(5),
      stats: {
        total_sent: 22,
        total_delivered: 21,
        total_failed: 1,
        total_pending: 0,
        total_cost: 22 * 0.08,
        delivery_rate: 95.45,
      },
      created_at: daysAgo(7),
    },
    {
      id: id(),
      user_id: 'demo-user',
      name: 'Rappel vaccination grippe',
      message: 'Cher patient, nous vous rappelons votre rendez-vous demain à 14h30. Merci de venir 5 min avant.',
      segment_id: 2,
      status: 'sent',
      scheduled_at: undefined,
      sent_at: daysAgo(2),
      completed_at: daysAgo(2),
      stats: {
        total_sent: 18,
        total_delivered: 17,
        total_failed: 1,
        total_pending: 0,
        total_cost: 18 * 0.08,
        delivery_rate: 94.44,
      },
      created_at: daysAgo(3),
    },
    {
      id: id(),
      user_id: 'demo-user',
      name: 'Soldes d\'hiver',
      message: '❄️ Les soldes d\'hiver débutent ! Jusqu\'à -50% sur une sélection. Découvrez vite nos offres.',
      segment_id: 1,
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      created_at: daysAgo(1),
    },
    {
      id: id(),
      user_id: 'demo-user',
      name: 'Newsletter Janvier',
      message: 'Bonjour {prenom}, découvrez notre newsletter de janvier avec les dernières actualités.',
      segment_id: 1,
      status: 'sending',
      sent_at: daysAgo(0),
      stats: {
        total_sent: 22,
        total_delivered: 14,
        total_failed: 0,
        total_pending: 8,
        total_cost: 22 * 0.08,
        delivery_rate: 63.64,
      },
      created_at: daysAgo(0),
    },
  ]

  // === SMS logs (~80) avec engagement tracking ===
  const smsLogs: SMSLog[] = []
  for (const camp of campaigns) {
    if (!camp.stats) continue
    const targetCount = Math.min(camp.stats.total_sent, contacts.length)
    for (let i = 0; i < targetCount; i++) {
      const contact = contacts[i]
      const isDelivered = i < camp.stats.total_delivered
      const isFailed = !isDelivered && i < camp.stats.total_sent
      const sentAt = camp.sent_at ? new Date(camp.sent_at).getTime() + i * 1000 : Date.now() - i * 1000

      const isRead = isDelivered && Math.random() < 0.65
      const isClicked = isRead && Math.random() < 0.45
      const hasReplied = isDelivered && Math.random() < 0.08
      const hasOptOut = isDelivered && Math.random() < 0.02

      const readAt = isRead ? new Date(sentAt + Math.random() * 30000).toISOString() : undefined
      const clickedAt = isClicked && readAt ? new Date(new Date(readAt).getTime() + Math.random() * 60000).toISOString() : undefined

      const replies = hasReplied
        ? [{ text: hasOptOut ? 'STOP' : Math.random() > 0.5 ? 'YES' : 'INFO', received_at: new Date(sentAt + Math.random() * 3600000).toISOString() }]
        : undefined

      smsLogs.push({
        id: id(),
        campaign_id: camp.id,
        contact_id: contact?.id,
        phone: contact?.phone || '',
        message: camp.message,
        message_sid: `SMdemo${id()}`,
        status: isDelivered ? 'delivered' : isFailed ? 'failed' : 'sent',
        cost: 0.08,
        sent_at: new Date(sentAt).toISOString(),
        delivered_at: isDelivered ? new Date(sentAt + Math.random() * 5000).toISOString() : undefined,
        failed_at: isFailed ? new Date(sentAt + 1000).toISOString() : undefined,
        error_message: isFailed ? 'Numéro invalide (21211)' : undefined,
        tracking_id: isDelivered || !isFailed ? `trk_${id()}` : undefined,
        engagement: (isRead || hasReplied)
          ? {
              read_at: readAt,
              clicked_at: clickedAt,
              clicked_url: clickedAt ? 'https://example.com/promo' : undefined,
              replies,
            }
          : undefined,
        created_at: new Date(sentAt).toISOString(),
      })
    }
  }

  // === Auto-répondeurs (5) ===
  const autoReplyRules: AutoReplyRule[] = [
    {
      id: id(),
      user_id: 'demo-user',
      keyword: 'STOP',
      match_type: 'exact',
      response_message: 'Vous avez été désabonné. Pour vous réinscrire, envoyez START au même numéro.',
      description: 'Désabonnement RGPD obligatoire',
      trigger_count: 12,
      is_active: true,
      case_sensitive: false,
      actions: [{ type: 'opt_in', value: false }],
      created_at: daysAgo(90),
      updated_at: daysAgo(10),
    },
    {
      id: id(),
      user_id: 'demo-user',
      keyword: 'START',
      match_type: 'exact',
      response_message: 'Bienvenue ! Vous êtes réinscrit à nos SMS. Envoyez STOP pour vous désinscrire.',
      description: 'Réinscription rapide',
      trigger_count: 5,
      is_active: true,
      case_sensitive: false,
      actions: [{ type: 'opt_in', value: true }],
      created_at: daysAgo(90),
      updated_at: daysAgo(10),
    },
    {
      id: id(),
      user_id: 'demo-user',
      keyword: 'OUI',
      match_type: 'exact',
      response_message: 'Merci pour votre confirmation ! Votre code -20% PROMO20 est valable 7 jours.',
      description: 'Confirmation / Intéressé',
      trigger_count: 24,
      is_active: true,
      case_sensitive: false,
      actions: [{ type: 'add_tag', tag: 'engaged' }],
      created_at: daysAgo(30),
      updated_at: daysAgo(5),
    },
    {
      id: id(),
      user_id: 'demo-user',
      keyword: 'INFO',
      match_type: 'exact',
      response_message: 'Plus d\'infos sur notre site. Horaires : Lu-Ve 9h-18h. Support par email.',
      description: 'Demande d\'informations',
      trigger_count: 8,
      is_active: true,
      case_sensitive: false,
      created_at: daysAgo(60),
      updated_at: daysAgo(5),
    },
    {
      id: id(),
      user_id: 'demo-user',
      keyword: 'RDV',
      match_type: 'exact',
      response_message: 'Votre demande de RDV est enregistrée. Notre équipe vous recontacte sous 24h.',
      description: 'Prise de rendez-vous',
      trigger_count: 6,
      is_active: true,
      case_sensitive: false,
      actions: [{ type: 'add_tag', tag: 'rdv-request' }],
      created_at: daysAgo(20),
      updated_at: daysAgo(2),
    },
  ]

  // === Coupons (4) ===
  const coupons: Coupon[] = [
    {
      id: id(),
      user_id: 'demo-user',
      code: 'BLACK25',
      campaign_id: 1,
      type: 'percentage',
      value: 25,
      description: 'Black Friday 2024 - 25% sur tout',
      valid_from: daysAgo(10),
      valid_until: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      max_uses: 500,
      current_uses: 12,
      per_contact_limit: 1,
      is_active: true,
      terms: 'Non cumulable.',
      created_at: daysAgo(10),
    },
    {
      id: id(),
      user_id: 'demo-user',
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      description: 'Bienvenue nouveaux clients - 10%',
      valid_from: daysAgo(60),
      valid_until: new Date(Date.now() + 305 * 24 * 3600 * 1000).toISOString(),
      max_uses: undefined,
      current_uses: 5,
      per_contact_limit: 1,
      is_active: true,
      terms: 'Une seule utilisation par client.',
      created_at: daysAgo(60),
    },
    {
      id: id(),
      user_id: 'demo-user',
      code: 'FIXE5',
      type: 'fixed_amount',
      value: 5,
      description: '5€ de réduction dès 30€ d\'achat',
      valid_from: daysAgo(5),
      valid_until: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
      max_uses: 200,
      current_uses: 3,
      per_contact_limit: 2,
      is_active: true,
      created_at: daysAgo(5),
    },
    {
      id: id(),
      user_id: 'demo-user',
      code: 'LIVRAISON',
      type: 'free_shipping',
      value: 0,
      description: 'Livraison offerte',
      valid_from: daysAgo(30),
      valid_until: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      max_uses: 1000,
      current_uses: 18,
      per_contact_limit: 1,
      is_active: true,
      created_at: daysAgo(30),
    },
  ]

  // === Utilisations de coupons (4) ===
  const couponUsages: CouponUsage[] = [
    { id: id(), coupon_id: 1, coupon_code: 'BLACK25', contact_id: 1, phone: contacts[0].phone, used_at: daysAgo(3), order_value: 78.50, source: 'sms_campaign', campaign_id: 1 },
    { id: id(), coupon_id: 1, coupon_code: 'BLACK25', contact_id: 2, phone: contacts[1].phone, used_at: daysAgo(2), order_value: 125.00, source: 'sms_campaign', campaign_id: 1 },
    { id: id(), coupon_id: 1, coupon_code: 'BLACK25', contact_id: 3, phone: contacts[2].phone, used_at: daysAgo(1), order_value: 45.00, source: 'sms_campaign', campaign_id: 1 },
    { id: id(), coupon_id: 2, coupon_code: 'WELCOME10', contact_id: 5, phone: contacts[4].phone, used_at: daysAgo(5), order_value: 65.00, source: 'sms_campaign' },
  ]

  // === Invitations (2) ===
  const invitations: Invitation[] = [
    {
      id: id(),
      user_id: 'demo-user',
      campaign_id: 1,
      title: 'Soirée VIP Black Friday',
      description: 'Soirée exclusive pour nos meilleurs clients',
      type: 'event',
      event_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      location: 'Galerie Anspach 12, Bruxelles',
      unique_token: `inv_demo_${id()}`,
      max_guests: 2,
      response_deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      status: 'active',
      responses: [
        { id: id(), invitation_id: 1, contact_id: 1, phone: contacts[0].phone, response: 'accepted', guests_count: 2, responded_at: daysAgo(2) },
        { id: id(), invitation_id: 1, contact_id: 2, phone: contacts[1].phone, response: 'pending', guests_count: 1 },
        { id: id(), invitation_id: 1, contact_id: 3, phone: contacts[2].phone, response: 'declined', guests_count: 0, responded_at: daysAgo(1) },
      ],
      created_at: daysAgo(5),
    },
    {
      id: id(),
      user_id: 'demo-user',
      title: 'Webinaire Marketing SMS',
      description: 'Découvrez les meilleures pratiques',
      type: 'event',
      event_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      location: 'En ligne (Zoom)',
      unique_token: `inv_demo_${id()}`,
      max_guests: 1,
      response_deadline: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
      status: 'active',
      responses: [
        { id: id(), invitation_id: 2, contact_id: 4, phone: contacts[3].phone, response: 'accepted', guests_count: 1, responded_at: daysAgo(1) },
        { id: id(), invitation_id: 2, contact_id: 6, phone: contacts[5].phone, response: 'maybe', guests_count: 1, responded_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
      ],
      created_at: daysAgo(3),
    },
  ]

  // === Inbox (8 messages) ===
  const inboxMessages: InboxMessage[] = [
    { id: id(), contact_id: 1, phone: contacts[0].phone, direction: 'inbound', message: 'OUI', keyword_detected: 'OUI', auto_reply_sent: true, rule_triggered_id: 3, received_at: daysAgo(0), is_read: false },
    { id: id(), contact_id: 2, phone: contacts[1].phone, direction: 'inbound', message: 'INFO', keyword_detected: 'INFO', auto_reply_sent: true, rule_triggered_id: 4, received_at: daysAgo(0), is_read: false },
    { id: id(), contact_id: 3, phone: contacts[2].phone, direction: 'inbound', message: 'STOP', keyword_detected: 'STOP', auto_reply_sent: true, rule_triggered_id: 1, received_at: daysAgo(0), is_read: true },
    { id: id(), contact_id: 5, phone: contacts[4].phone, direction: 'inbound', message: 'RDV', keyword_detected: 'RDV', auto_reply_sent: true, rule_triggered_id: 5, received_at: daysAgo(1), is_read: true },
    { id: id(), contact_id: 7, phone: contacts[6].phone, direction: 'inbound', message: 'Bonjour, je voudrais avoir plus d\'infos svp', auto_reply_sent: false, received_at: daysAgo(1), is_read: true },
    { id: id(), contact_id: 1, phone: contacts[0].phone, direction: 'outbound', message: '🔥 Black Friday ! -25% sur tout', auto_reply_sent: false, received_at: daysAgo(5), is_read: true },
    { id: id(), contact_id: 4, phone: contacts[3].phone, direction: 'inbound', message: 'YES', keyword_detected: 'OUI', auto_reply_sent: true, rule_triggered_id: 3, received_at: daysAgo(2), is_read: true },
    { id: id(), contact_id: 8, phone: contacts[7].phone, direction: 'inbound', message: 'Merci pour la promo !', auto_reply_sent: false, received_at: daysAgo(3), is_read: true },
  ]

  return {
    contacts,
    campaigns,
    smsLogs,
    autoReplyRules,
    coupons,
    couponUsages,
    invitations,
    inboxMessages,
  }
}
