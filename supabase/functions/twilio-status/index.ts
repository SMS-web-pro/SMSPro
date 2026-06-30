// Supabase Edge Function : Réception des webhooks Twilio
// À déployer avec : supabase functions deploy twilio-status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
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
      return new Response('Unsupported content type', { status: 400 })
    }

    console.log('Twilio webhook:', payload)

    if (!payload.MessageSid || !payload.MessageStatus) {
      return new Response('Missing required fields', { status: 400 })
    }

    const status = payload.MessageStatus.toLowerCase()
    const updates: Record<string, any> = { status }

    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString()
    } else if (status === 'failed' || status === 'undelivered') {
      updates.failed_at = new Date().toISOString()
      if (payload.ErrorCode) updates.error_code = payload.ErrorCode
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
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('audit_logs').insert({
      action: 'twilio_webhook',
      entity_type: 'sms_log',
      details: payload,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
