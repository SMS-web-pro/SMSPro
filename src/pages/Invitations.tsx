/**
 * Invitations - Gestion des invitations événementielles
 * CRUD + suivi des RSVP
 *
 * Connecté à l'API Supabase
 */

import { useState, useMemo } from 'react'
import {
  Mail,
  Plus,
  Search,
  Copy,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  MapPin,
  Sparkles,
  Clock,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import { formatDate } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useInvitations, useInvitationMutations } from '@/hooks/useApi'

const typeLabels = {
  event: { label: 'Événement', icon: Sparkles, color: 'purple' },
  appointment: { label: 'Rendez-vous', icon: Calendar, color: 'blue' },
  offer: { label: 'Offre spéciale', icon: Mail, color: 'amber' },
  vip: { label: 'VIP', icon: Sparkles, color: 'rose' },
  reminder: { label: 'Rappel', icon: Clock, color: 'slate' },
}

export function InvitationsPage() {
  // API réelle
  const { data: apiInvitations, loading, error, refresh } = useInvitations()
  const mutations = useInvitationMutations()
  const addToast = useStore((s) => s.addToast)

  const invitations = apiInvitations || []
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedInv, setSelectedInv] = useState<any | null>(null)
  // Loading state
  if (loading && invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement des invitations...</p>
      </div>
    )
  }

  if (error && invitations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700 mb-3">Erreur : {error}</p>
          <Button onClick={refresh} size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Filtrage
  const filtered = useMemo(() => {
    return invitations.filter((i: any) =>
      !search ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase())
    )
  }, [invitations, search])

  // Stats
  const stats = useMemo(() => {
    const totalInvited = invitations.reduce((s: number, i: any) => s + (i.responses?.length || 0), 0)
    const accepted = invitations.reduce(
      (s: number, i: any) => s + (i.responses?.filter((r: any) => r.response === 'accepted').length || 0),
      0
    )
    return {
      total: invitations.length,
      totalInvited,
      accepted,
      conversionRate: totalInvited > 0 ? (accepted / totalInvited) * 100 : 0,
    }
  }, [invitations])

  const handleDelete = async (inv: any) => {
    if (!confirm(`Supprimer l'invitation "${inv.title}" ?`)) return
    const result = await mutations.remove(inv.id)
    if (result.error) {
      addToast({ type: 'error', title: 'Erreur', description: result.error })
    } else {
      addToast({ type: 'success', title: 'Invitation supprimée' })
    }
    refresh()
  }

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/i/${token}`
    try {
      await navigator.clipboard.writeText(link)
      addToast({ type: 'success', title: 'Lien copié !', description: link })
    } catch {
      addToast({ type: 'error', title: 'Erreur de copie' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-purple-500" />
            Invitations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {invitations.length} invitation(s) • {stats.totalInvited} invité(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreate(true)}
          >
            Nouvelle invitation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Invitations actives" value={stats.total} color="purple" />
        <StatBox label="Invités au total" value={stats.totalInvited} color="blue" />
        <StatBox label="Acceptées" value={stats.accepted} color="emerald" />
        <StatBox label="Taux conversion" value={`${stats.conversionRate.toFixed(1)}%`} color="amber" />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Rechercher une invitation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="Aucune invitation"
            description="Créez votre première invitation événementielle."
            action={{ label: 'Nouvelle invitation', onClick: () => setShowCreate(true) }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((inv: any) => {
            const tc = typeLabels[inv.type as keyof typeof typeLabels]
            const Icon = tc.icon
            const responses = inv.responses || []
            const acceptedCount = responses.filter((r: any) => r.response === 'accepted').length
            const declinedCount = responses.filter((r: any) => r.response === 'declined').length
            const maybeCount = responses.filter((r: any) => r.response === 'maybe').length
            const pendingCount = responses.filter((r: any) => r.response === 'pending').length
            const totalGuests = responses
              .filter((r: any) => r.response === 'accepted')
              .reduce((s: number, r: any) => s + r.guests_count, 0)

            const pieData = [
              { name: 'Accepté', value: acceptedCount, color: '#10b981' },
              { name: 'Refusé', value: declinedCount, color: '#ef4444' },
              { name: 'Peut-être', value: maybeCount, color: '#f59e0b' },
              { name: 'En attente', value: pendingCount, color: '#94a3b8' },
            ].filter((d) => d.value > 0)

            return (
              <Card
                key={inv.id}
                className={cn(
                  'hover:shadow-md transition-all cursor-pointer',
                  selectedInv?.id === inv.id && 'ring-2 ring-primary-500'
                )}
                onClick={() => setSelectedInv(inv)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-lg flex-shrink-0',
                        tc.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                        tc.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        tc.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                        tc.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{inv.title}</h3>
                        {inv.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{inv.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={inv.status === 'active' ? 'success' : 'gray'} size="sm">
                      {inv.status === 'active' ? 'Active' : inv.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 mb-4 text-xs">
                    {inv.event_date && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{formatDate(inv.event_date, 'EEEE d MMM yyyy à HH:mm')}</span>
                      </div>
                    )}
                    {inv.location && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{inv.location}</span>
                      </div>
                    )}
                  </div>

                  {responses.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        {pieData.length > 0 && (
                          <div className="h-14 w-14 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={15} outerRadius={28} dataKey="value">
                                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          {pieData.map((d) => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: d.color }} />
                                <span className="text-slate-600">{d.name}</span>
                              </div>
                              <span className="font-semibold text-slate-900">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 p-2 flex flex-col justify-center">
                        <p className="text-[10px] text-purple-700 font-medium uppercase">Invités confirmés</p>
                        <p className="text-2xl font-bold text-purple-900">{totalGuests}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleCopyLink(inv.unique_token) }}
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                    >
                      Copier lien
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); window.open(`/i/${inv.unique_token}`, '_blank') }}
                      leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                    >
                      Voir
                    </Button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(inv) }}
                      className="ml-auto rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <InvitationFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={async (data) => {
          const result = await mutations.create(data as any)
          if (result.error) {
            addToast({ type: 'error', title: 'Erreur', description: result.error })
          } else {
            addToast({ type: 'success', title: 'Invitation créée !' })
          }
          setShowCreate(false)
          refresh()
        }}
      />
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: any; color: 'purple' | 'blue' | 'emerald' | 'amber' }) {
  const colorMap = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={cn('rounded-lg border p-3', colorMap[color])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function InvitationFormModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'event' as 'event' | 'appointment' | 'offer' | 'vip' | 'reminder',
    event_date: '',
    location: '',
    max_guests: 2,
    response_deadline: '',
  })

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle invitation" size="lg">
      <div className="space-y-4">
        <Input
          label="Titre *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Soirée VIP"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description de l'événement"
          rows={3}
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          options={[
            { value: 'event', label: '🎉 Événement' },
            { value: 'appointment', label: '📅 Rendez-vous' },
            { value: 'offer', label: '🎁 Offre spéciale' },
            { value: 'vip', label: '⭐ VIP' },
            { value: 'reminder', label: '⏰ Rappel' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date de l'événement"
            type="datetime-local"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
          <Input
            label="Date limite de réponse"
            type="datetime-local"
            value={form.response_deadline}
            onChange={(e) => setForm({ ...form, response_deadline: e.target.value })}
          />
        </div>
        <Input
          label="Lieu"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Galerie Anspach 12, Bruxelles"
        />
        <Input
          label="Invités max par personne"
          type="number"
          value={String(form.max_guests)}
          onChange={(e) => setForm({ ...form, max_guests: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button
          onClick={() => {
            if (!form.title) return
            onSave({
              ...form,
              event_date: form.event_date ? new Date(form.event_date).toISOString() : undefined,
              response_deadline: form.response_deadline ? new Date(form.response_deadline).toISOString() : undefined,
            })
          }}
          disabled={!form.title}
        >
          Créer
        </Button>
      </div>
    </Modal>
  )
}
