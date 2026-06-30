// Supabase Edge Function : Envoi RÉEL de SMS via Twilio
// Déployer avec : supabase functions deploy send-sms

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
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
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { campaignId, contactIds, message, senderNumber } = await req.json()

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return new Response(JSON.stringify({ error: 'contactIds requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'message requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Récupérer les contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', contactIds)
      .eq('user_id', user.id)
      .eq('opted_in', true)

    if (contactsError) {
      return new Response(JSON.stringify({ error: contactsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Récupérer la config Twilio de l'utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('twilio_config')
      .eq('id', user.id)
      .single()

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const defaultFrom = Deno.env.get('TWILIO_PHONE_NUMBER')

    const from = senderNumber || profile?.twilio_config?.senderNumber || defaultFrom

    if (!accountSid || !authToken || !from) {
      return new Response(JSON.stringify({
        error: 'Twilio non configuré. Configurez-le dans Paramètres → SMS & Twilio',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const projectUrl = Deno.env.get('SUPABASE_URL') || ''
    const projectRef = projectUrl.split('//')[1]?.split('.')[0] || ''
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/twilio-status`

    // Envoyer les SMS un par un
    const results = []
    for (const contact of contacts || []) {
      // Personnaliser le message
      let personalizedMessage = message
        .replace(/\{prenom\}/gi, contact.first_name || '')
        .replace(/\{nom\}/gi, contact.last_name || '')
        .replace(/\{ville\}/gi, contact.city || '')

      const result = await sendTwilioSMS(
        contact.phone,
        from,
        personalizedMessage,
        accountSid,
        authToken,
        webhookUrl
      )

      // Enregistrer le log
      if (campaignId) {
        await supabase.from('sms_logs').insert({
          campaign_id: campaignId,
          contact_id: contact.id,
          phone: contact.phone,
          message: personalizedMessage,
          message_sid: result.messageSid,
          status: result.success ? 'sent' : 'failed',
          error_code: result.code,
          error_message: result.error,
          cost: result.price ? Math.abs(parseFloat(result.price)) : 0.08,
          sent_at: new Date().toISOString(),
        })
      }

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

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        sent: successCount,
        failed: failedCount,
        results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
