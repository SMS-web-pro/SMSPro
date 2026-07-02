// Supabase Edge Function : Réception des SMS ENTRANTS (Twilio webhook)
// Déployer avec : supabase functions deploy twilio-incoming
//
// Configuration Twilio :
// Phone Numbers → [numéro] → Messaging → "A Message Comes In"
// URL : https://<project-ref>.supabase.co/functions/v1/twilio-incoming
// Method : POST

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Match keyword based on match_type
function matchKeyword(messageLower: string, keyword: string, matchType: string, caseSensitive: boolean): boolean {
  const msg = caseSensitive ? messageLower : messageLower
  const kw = caseSensitive ? keyword : keyword.toLowerCase()

  switch (matchType) {
    case 'exact':
      return msg.trim() === kw
    case 'starts_with':
      return msg.startsWith(kw)
    case 'contains':
    default:
      return msg.includes(kw)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let payload: any

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      payload = Object.fromEntries(formData.entries())
    } else if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      return new Response('Unsupported content type', { status: 400, headers: CORS_HEADERS })
    }

    console.log('Incoming SMS:', JSON.stringify(payload))

    const from = payload.From || ''
    const to = payload.To || ''
    const body = payload.Body || ''
    const messageSid = payload.MessageSid || ''

    if (!from || !body) {
      return new Response(JSON.stringify({ error: 'Missing From or Body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Normaliser le numéro de téléphone
    const normalizedPhone = from.replace(/[^0-9+]/g, '')

    // Trouver l'utilisateur propriétaire du numéro de destination
    const { data: users } = await supabase
      .from('users')
      .select('id, sms_config, twilio_config')

    let ownerUserId: string | null = null

    for (const user of users || []) {
      const smsConfig = user.sms_config || user.twilio_config
      const senderNumber = smsConfig?.twilio?.senderNumber || smsConfig?.telnyx?.senderNumber
      if (senderNumber) {
        const normalizedSender = senderNumber.replace(/[^0-9+]/g, '')
        const normalizedTo = to.replace(/[^0-9+]/g, '')
        if (normalizedSender === normalizedTo || normalizedSender.endsWith(normalizedTo.slice(-8)) || normalizedTo.endsWith(normalizedSender.slice(-8))) {
          ownerUserId = user.id
          break
        }
      }
    }

    // Trouver ou créer le contact
    let contactId: number | null = null

    if (ownerUserId) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', ownerUserId)
        .eq('phone', normalizedPhone)
        .single()

      if (existingContact) {
        contactId = existingContact.id
      } else {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: ownerUserId,
            phone: normalizedPhone,
            first_name: null,
            last_name: null,
            opted_in: true,
            opted_in_date: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (newContact) {
          contactId = newContact.id
        }
      }
    }

    // Match auto-reply rules BEFORE inserting inbox (to get rule_triggered_id)
    let matchedRule: any = null
    let matchedKeyword: string | null = null

    if (ownerUserId) {
      const { data: rules } = await supabase
        .from('auto_reply_rules')
        .select('*')
        .eq('user_id', ownerUserId)
        .eq('is_active', true)

      if (rules && rules.length > 0) {
        const messageLower = body.toLowerCase().trim()
        for (const rule of rules) {
          const keywords = (rule.keyword || '').split(',').map((k: string) => k.trim())
          const caseSensitive = rule.case_sensitive || false
          const matchType = rule.match_type || 'contains'

          for (const kw of keywords) {
            if (kw && matchKeyword(messageLower, kw, matchType, caseSensitive)) {
              matchedRule = rule
              matchedKeyword = kw
              break
            }
          }
          if (matchedRule) break
        }
      }
    }

    // Insérer dans inbox_messages (avec rule_triggered_id et keyword_detected)
    const inboxEntry: any = {
      phone: normalizedPhone,
      message: body,
      direction: 'inbound',
      is_read: false,
      auto_reply_sent: false,
      received_at: new Date().toISOString(),
    }

    if (ownerUserId) {
      inboxEntry.user_id = ownerUserId
    }
    if (contactId) {
      inboxEntry.contact_id = contactId
    }
    if (matchedRule) {
      inboxEntry.rule_triggered_id = matchedRule.id
      inboxEntry.keyword_detected = matchedKeyword
    }

    const { data: insertedMessage, error: inboxError } = await supabase
      .from('inbox_messages')
      .insert(inboxEntry)
      .select('id')
      .single()

    if (inboxError) {
      console.error('Inbox insert error:', inboxError)
    }

    // Execute matched rule
    if (matchedRule && ownerUserId) {
      const { data: profile } = await supabase
        .from('users')
        .select('sms_config, twilio_config')
        .eq('id', ownerUserId)
        .single()

      const smsConfig = profile?.sms_config || profile?.twilio_config
      const activeProvider = smsConfig?.activeProvider || 'twilio'

      if (activeProvider === 'twilio') {
        const accountSid = smsConfig?.twilio?.accountSid
        const authToken = smsConfig?.twilio?.authToken
        const senderNumber = smsConfig?.twilio?.senderNumber

        if (accountSid && authToken && senderNumber) {
          const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
          const auth = btoa(`${accountSid}:${authToken}`)
          const formData = new URLSearchParams()
          formData.append('To', normalizedPhone)
          formData.append('From', senderNumber)
          formData.append('Body', matchedRule.response_message)

          await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          })

          // Marquer comme auto-reply
          if (insertedMessage?.id) {
            await supabase
              .from('inbox_messages')
              .update({ auto_reply_sent: true })
              .eq('id', insertedMessage.id)
          }
        }
      } else if (activeProvider === 'telnyx') {
        // Telnyx auto-reply
        const apiKey = smsConfig?.telnyx?.apiKey
        const senderNumber = smsConfig?.telnyx?.senderNumber

        if (apiKey && senderNumber) {
          await fetch('https://api.telnyx.com/v2/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: senderNumber,
              to: normalizedPhone,
              text: matchedRule.response_message,
            }),
          })

          if (insertedMessage?.id) {
            await supabase
              .from('inbox_messages')
              .update({ auto_reply_sent: true })
              .eq('id', insertedMessage.id)
          }
        }
      }

      // Execute rule actions
      if (matchedRule.actions && Array.isArray(matchedRule.actions) && contactId) {
        for (const action of matchedRule.actions) {
          if (action.type === 'opt_out') {
            await supabase
              .from('contacts')
              .update({ opted_in: false, opted_out_date: new Date().toISOString() })
              .eq('id', contactId)
          } else if (action.type === 'opt_in') {
            await supabase
              .from('contacts')
              .update({ opted_in: true, opted_in_date: new Date().toISOString() })
              .eq('id', contactId)
          } else if (action.type === 'add_tag' && action.tag) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('tags')
              .eq('id', contactId)
              .single()
            const existingTags = contact?.tags || []
            if (!existingTags.includes(action.tag)) {
              await supabase
                .from('contacts')
                .update({ tags: [...existingTags, action.tag] })
                .eq('id', contactId)
            }
          } else if (action.type === 'send_coupon' && action.coupon_id) {
            // Call use_coupon RPC to properly track usage
            const { data: couponResult } = await supabase
              .rpc('use_coupon', {
                p_code: '', // Will be looked up by coupon_id
                p_contact_id: contactId,
                p_source: 'auto_reply',
              })

            // Fallback: if RPC doesn't support coupon_id lookup, send code directly
            if (!couponResult?.success) {
              const { data: coupon } = await supabase
                .from('coupons')
                .select('code')
                .eq('id', action.coupon_id)
                .single()
              if (coupon?.code) {
                const { data: profile2 } = await supabase
                  .from('users')
                  .select('sms_config, twilio_config')
                  .eq('id', ownerUserId)
                  .single()
                const cfg = profile2?.sms_config || profile2?.twilio_config
                const provider = cfg?.activeProvider || 'twilio'
                if (provider === 'twilio') {
                  const sid = cfg?.twilio?.accountSid
                  const token = cfg?.twilio?.authToken
                  const from2 = cfg?.twilio?.senderNumber
                  if (sid && token && from2) {
                    const auth2 = btoa(`${sid}:${token}`)
                    const fd = new URLSearchParams()
                    fd.append('To', normalizedPhone)
                    fd.append('From', from2)
                    fd.append('Body', `Voici votre coupon : ${coupon.code}`)
                    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                      method: 'POST',
                      headers: { 'Authorization': `Basic ${auth2}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: fd.toString(),
                    })
                  }
                } else if (provider === 'telnyx') {
                  const key = cfg?.telnyx?.apiKey
                  const from2 = cfg?.telnyx?.senderNumber
                  if (key && from2) {
                    await fetch('https://api.telnyx.com/v2/messages', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ from: from2, to: normalizedPhone, text: `Voici votre coupon : ${coupon.code}` }),
                    })
                  }
                }
              }
            }
          }
        }
      }
    }

    // Répondre à Twilio (Twilio attend un TwiML ou un 200 OK)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (error) {
    console.error('Incoming SMS error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }
})
