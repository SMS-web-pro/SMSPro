/**
 * Page publique d'invitation
 *
 * Permet aux invités de voir les détails et répondre (RSVP)
 * sans avoir besoin de se connecter.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Check,
  X,
  HelpCircle,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

// Client Supabase anonyme (pas d'auth)
function getAnonClient() {
  const url = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || ''
  const key = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || ''

  if (!url || !key) {
    // Fallback: essayer localStorage
    try {
      const stored = localStorage.getItem('smspro-supabase-config')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.url && parsed.key) {
          return createClient(parsed.url, parsed.key)
        }
      }
    } catch {}
    return null
  }

  return createClient(url, key)
}

const responseOptions = [
  { value: 'accepted', label: 'Accepter', icon: Check, color: 'emerald' },
  { value: 'declined', label: 'Refuser', icon: X, color: 'red' },
  { value: 'maybe', label: 'Peut-être', icon: HelpCircle, color: 'amber' },
] as const

export default function InvitationPublicPage() {
  const { token } = useParams<{ token: string }>()
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [phone, setPhone] = useState('')
  const [guestsCount, setGuestsCount] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token manquant')
      setLoading(false)
      return
    }

    const client = getAnonClient()
    if (!client) {
      setError('Configuration Supabase manquante')
      setLoading(false)
      return
    }

    async function fetchInvitation() {
      try {
        const { data, error: fetchError } = await client!
          .from('invitations')
          .select('*')
          .eq('unique_token', token)
          .single()

        if (fetchError || !data) {
          setError('Invitation introuvable ou expirée')
          return
        }

        if (data.status !== 'active') {
          setError('Cette invitation n\'est plus active')
          return
        }

        // Vérifier la deadline
        if (data.response_deadline && new Date(data.response_deadline) < new Date()) {
          setError('La date limite de réponse a été dépassée')
          return
        }

        setInvitation(data)
      } catch (err) {
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleSubmitResponse = async () => {
    if (!selectedResponse || !phone.trim() || !invitation) return

    setSubmitting(true)
    try {
      const client = getAnonClient()
      if (!client) throw new Error('Client non configuré')

      // Utiliser le RPC pour insérer la réponse (bypass RLS)
      const { error: rpcError } = await client.rpc('respond_to_invitation', {
        p_token: token,
        p_phone: phone.trim(),
        p_response: selectedResponse,
        p_guests_count: guestsCount,
        p_notes: notes.trim() || null,
      })

      if (rpcError) throw rpcError

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chargement de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Oops!</h2>
            <p className="text-sm text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Merci!</h2>
            <p className="text-sm text-slate-600">
              Votre réponse a bien été enregistrée.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <div className="max-w-lg mx-auto p-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{invitation.title}</h1>
          {invitation.description && (
            <p className="text-sm text-slate-600 mt-2 max-w-sm mx-auto">{invitation.description}</p>
          )}
        </div>

        {/* Détails */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="space-y-3">
              {invitation.event_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span className="text-slate-700">
                    {new Date(invitation.event_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {invitation.event_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-slate-700">
                    {new Date(invitation.event_date).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {invitation.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <span className="text-slate-700">{invitation.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-slate-700">
                  {invitation.max_guests} place(s) max par personne
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire RSVP */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Confirmez votre présence
            </h2>

            {/* Boutons de réponse */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {responseOptions.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setSelectedResponse(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                    selectedResponse === value
                      ? color === 'emerald'
                        ? 'border-emerald-500 bg-emerald-50'
                        : color === 'red'
                        ? 'border-red-500 bg-red-50'
                        : 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      selectedResponse === value
                        ? color === 'emerald'
                          ? 'text-emerald-600'
                          : color === 'red'
                          ? 'text-red-600'
                          : 'text-amber-600'
                        : 'text-slate-400'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      selectedResponse === value ? 'text-slate-900' : 'text-slate-500'
                    )}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {selectedResponse && (
              <div className="space-y-3">
                <Input
                  label="Votre téléphone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+32 470 12 34 56"
                  type="tel"
                />
                <Input
                  label="Nombre d'invités"
                  type="number"
                  value={String(guestsCount)}
                  onChange={(e) => setGuestsCount(Math.max(1, Math.min(invitation.max_guests, Number(e.target.value))))}
                  min={1}
                  max={invitation.max_guests}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, remarques..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={!phone.trim() || submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Envoyer ma réponse'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
