// Supabase Edge Function : Réception des webhooks Twilio
// À déployer avec : supabase functions deploy twilio-status

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

// Map Twilio status to valid sms_logs status
function mapStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'queued',
    'sending': 'sending',
    'sent': 'sent',
    'delivered': 'delivered',
    'failed': 'failed',
    'undelivered': 'undelivered',
    'busy': 'failed',
    'no-answer': 'failed',
    'canceled': 'failed',
  }
  return statusMap[twilioStatus.toLowerCase()] || 'failed'
}

// Vérifier la signature HMAC-SHA1 de Twilio
async function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  const encoder = new TextEncoder()
  const keyData = encoder.encode(authToken)
  const dataData = encoder.encode(data)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataData)
  const computedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  )

  return computedSignature === signature
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
    let payload: Record<string, string> = {}

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      payload = Object.fromEntries(formData.entries())
    } else if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      return new Response('Unsupported content type', { status: 400, headers: CORS_HEADERS })
    }

    console.log('Twilio webhook:', JSON.stringify(payload))

    if (!payload.MessageSid || !payload.MessageStatus) {
      return new Response('Missing required fields', { status: 400, headers: CORS_HEADERS })
    }

    // Vérifier la signature Twilio
    const twilioSignature = req.headers.get('x-twilio-signature')
    if (twilioSignature) {
      const { data: smsLog } = await supabase
        .from('sms_logs')
        .select('contact_id')
        .eq('message_sid', payload.MessageSid)
        .single()

      if (smsLog?.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('user_id')
          .eq('id', smsLog.contact_id)
          .single()

        if (contact?.user_id) {
          // Read from sms_config OR twilio_config
          const { data: profile } = await supabase
            .from('users')
            .select('sms_config, twilio_config')
            .eq('id', contact.user_id)
            .single()

          const smsConfig = profile?.sms_config || profile?.twilio_config
          const authToken = smsConfig?.twilio?.authToken

          if (authToken) {
            const requestUrl = req.url
            const isValid = await verifyTwilioSignature(twilioSignature, requestUrl, payload, authToken)
            if (!isValid) {
              console.error('Invalid Twilio signature')
              return new Response('Invalid signature', { status: 403, headers: CORS_HEADERS })
            }
          } else {
            console.warn('No auth token found, skipping signature verification')
          }
        }
      }
    } else {
      console.warn('No X-Twilio-Signature header, skipping verification')
    }

    // Map status to valid CHECK constraint value
    const rawStatus = payload.MessageStatus.toLowerCase()
    const status = mapStatus(rawStatus)
    const updates: Record<string, any> = { status }

    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString()
    } else if (status === 'failed' || status === 'undelivered') {
      updates.failed_at = new Date().toISOString()
      if (payload.ErrorCode) updates.error_code = String(payload.ErrorCode)
      if (payload.ErrorMessage) updates.error_message = payload.ErrorMessage
    }

    const { error } = await supabase
      .from('sms_logs')
      .update(updates)
      .eq('message_sid', payload.MessageSid)

    if (error) {
      console.error('Update error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    await supabase.from('audit_logs').insert({
      action: 'twilio_webhook',
      entity_type: 'sms_log',
      details: payload,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }
})
