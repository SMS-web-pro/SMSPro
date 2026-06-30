/**
 * Client Twilio pour l'envoi RÉEL de SMS
 * 
 * Utilise le SDK Twilio officiel pour envoyer de vrais SMS
 * (pas de simulation)
 */

import twilio from 'twilio'

let twilioClient: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (twilioClient) return twilioClient

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      'Twilio non configuré. Variables requises: TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN'
    )
  }

  twilioClient = twilio(accountSid, authToken)
  return twilioClient
}

/**
 * Envoie un SMS via Twilio
 * 
 * @param to Numéro au format E.164 (+33..., +1..., etc.)
 * @param message Contenu du SMS
 * @param statusCallback URL pour recevoir les webhooks
 */
export async function sendSMS(
  to: string,
  message: string,
  statusCallback?: string
) {
  const client = getTwilioClient()
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!from) {
    throw new Error('TWILIO_PHONE_NUMBER non configuré')
  }

  try {
    const result = await client.messages.create({
      to,
      from,
      body: message,
      statusCallback,
    })

    return {
      success: true,
      messageSid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      price: result.price,
      direction: result.direction,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      code: err.code,
      moreInfo: err.moreInfo,
    }
  }
}

/**
 * Valide un numéro de téléphone (le format est vérifié par Twilio lors de l'envoi)
 */
export function formatPhoneE164(phone: string): string {
  // Si déjà au format +CC, retourner tel quel
  if (phone.startsWith('+')) return phone

  // Sinon ajouter + par défaut (Twilio rejettera si invalide)
  return '+' + phone.replace(/[^\d]/g, '')
}
