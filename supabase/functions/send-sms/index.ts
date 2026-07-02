// Supabase Edge Function : Envoi RÉEL de SMS via Twilio ou Telnyx
// Déployer avec : supabase functions deploy send-sms

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// Client Twilio via REST API (Edge Function compatible)
async function sendTwilioSMS(
  to: string,
  from: string,
  body: string,
  accountSid: string,
  authToken: string,
  statusCallback?: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = btoa(`${accountSid}:${authToken}`)

  const formData = new URLSearchParams()
  formData.append('To', to)
  formData.append('From', from)
  formData.append('Body', body)
  if (statusCallback) formData.append('StatusCallback', statusCallback)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.message || 'Erreur Twilio',
      code: data.code,
    }
  }

  return {
    success: true,
    messageSid: data.sid,
    status: data.status,
    to: data.to,
    from: data.from,
    price: data.price,
    errorCode: data.error_code,
    errorMessage: data.error_message,
  }
}

// Client Telnyx via REST API (Edge Function compatible)
async function sendTelnyxSMS(
  to: string,
  from: string,
  body: string,
  apiKey: string,
) {
  const url = 'https://api.telnyx.com/v2/messages'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      text: body,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.errors?.[0]?.detail || data.message || 'Erreur Telnyx',
      code: data.errors?.[0]?.code,
    }
  }

  return {
    success: true,
    messageSid: data.data?.id,
    status: data.data?.to?.[0]?.status,
    to: data.data?.to?.[0]?.phone_number,
    from: data.data?.from,
    price: data.data?.cost?.amount,
    errorCode: undefined,
    errorMessage: undefined,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Non authentifié' }, 401)
    }

    const body = await req.json()

    // Test action: send a single test SMS
    if (body.action === 'test') {
      const { provider, testNumber } = body
      if (!testNumber) {
        return jsonResponse({ error: 'Numéro de test requis' }, 400)
      }

      const { data: profile } = await supabase
        .from('users')
        .select('sms_config, twilio_config')
        .eq('id', user.id)
        .single()

      const smsConfig = profile?.sms_config || profile?.twilio_config
      const activeProvider = provider || smsConfig?.activeProvider || 'twilio'

      let result: any

      if (activeProvider === 'telnyx') {
        const apiKey = smsConfig?.telnyx?.apiKey
        const senderNumber = smsConfig?.telnyx?.senderNumber
        if (!apiKey || !senderNumber) {
          return jsonResponse({
            success: false,
            error: 'Telnyx non configuré. Renseignez API Key et Numéro.',
          })
        }
        result = await sendTelnyxSMS(testNumber, senderNumber, 'Test SMS depuis SMSPro ✓', apiKey)
      } else {
        const accountSid = smsConfig?.twilio?.accountSid
        const authToken = smsConfig?.twilio?.authToken
        const senderNumber = smsConfig?.twilio?.senderNumber
        if (!accountSid || !authToken || !senderNumber) {
          return jsonResponse({
            success: false,
            error: 'Twilio non configuré. Renseignez SID, Token et Numéro.',
          })
        }
        const projectUrl = Deno.env.get('SUPABASE_URL') || ''
        const projectRef = projectUrl.split('//')[1]?.split('.')[0] || ''
        const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/twilio-status`
        result = await sendTwilioSMS(testNumber, senderNumber, 'Test SMS depuis SMSPro ✓', accountSid, authToken, webhookUrl)
      }

      // Logger le test SMS pour que le status callback puisse le retrouver
      if (result.success && result.messageSid) {
        await supabase.from('sms_logs').insert({
          phone: testNumber,
          message: 'Test SMS depuis SMSPro ✓',
          message_sid: result.messageSid,
          status: 'sent',
          cost: result.price ? Math.abs(parseFloat(result.price)) : 0.08,
          sent_at: new Date().toISOString(),
        })
      }

      return jsonResponse({
        success: result.success,
        error: result.error || null,
        provider: activeProvider,
      })
    }

    const { campaignId, contactIds, message, senderNumber } = body

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return jsonResponse({ error: 'contactIds requis' }, 400)
    }

    if (!message) {
      return jsonResponse({ error: 'message requis' }, 400)
    }

    // Récupérer les contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', contactIds)
      .eq('user_id', user.id)
      .eq('opted_in', true)

    if (contactsError) {
      return jsonResponse({ error: contactsError.message }, 500)
    }

    // Récupérer la config SMS de l'utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('sms_config, twilio_config')
      .eq('id', user.id)
      .single()

    // Support migration: use sms_config, fallback to twilio_config
    const smsConfig = profile?.sms_config || profile?.twilio_config
    const activeProvider = smsConfig?.activeProvider || 'twilio'

    let from = ''
    let providerConfig: any = null

    if (activeProvider === 'telnyx') {
      providerConfig = smsConfig?.telnyx
      from = senderNumber || providerConfig?.senderNumber || ''
      if (!providerConfig?.apiKey || !from) {
        return jsonResponse({
          error: 'Telnyx non configuré. Configurez-le dans Paramètres → SMS',
        }, 400)
      }
    } else {
      // Default: Twilio
      providerConfig = smsConfig?.twilio
      from = senderNumber || providerConfig?.senderNumber || ''
      if (!providerConfig?.accountSid || !providerConfig?.authToken || !from) {
        return jsonResponse({
          error: 'Twilio non configuré. Configurez-le dans Paramètres → SMS',
        }, 400)
      }
    }

    // Envoyer les SMS un par un
    const results = []
    for (const contact of contacts || []) {
      // Personnaliser le message
      let personalizedMessage = message
        .replace(/\{prenom\}/gi, contact.first_name || '')
        .replace(/\{nom\}/gi, contact.last_name || '')
        .replace(/\{ville\}/gi, contact.city || '')

      let result: any

      if (activeProvider === 'telnyx') {
        result = await sendTelnyxSMS(
          contact.phone,
          from,
          personalizedMessage,
          providerConfig.apiKey,
        )
      } else {
        const projectUrl = Deno.env.get('SUPABASE_URL') || ''
        const projectRef = projectUrl.split('//')[1]?.split('.')[0] || ''
        const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/twilio-status`
        result = await sendTwilioSMS(
          contact.phone,
          from,
          personalizedMessage,
          providerConfig.accountSid,
          providerConfig.authToken,
          webhookUrl
        )
      }

      // Enregistrer le log (toujours, même sans campagne)
      const logEntry: any = {
        contact_id: contact.id,
        phone: contact.phone,
        message: personalizedMessage,
        message_sid: result.messageSid,
        status: result.success ? 'sent' : 'failed',
        error_code: result.code,
        error_message: result.error,
        cost: result.price ? Math.abs(parseFloat(result.price)) : 0.08,
        sent_at: new Date().toISOString(),
      }
      if (campaignId) {
        logEntry.campaign_id = campaignId
      }
      await supabase.from('sms_logs').insert(logEntry)

      results.push({
        contactId: contact.id,
        phone: contact.phone,
        success: result.success,
        messageSid: result.messageSid,
        error: result.error,
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.length - successCount

    return jsonResponse({
      success: true,
      total: results.length,
      sent: successCount,
      failed: failedCount,
      results,
    })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
