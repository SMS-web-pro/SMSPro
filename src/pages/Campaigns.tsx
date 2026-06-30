/**
 * Campaigns - Liste des campagnes
 * Affiche toutes les campagnes avec filtres et actions
 *
 * Connecté à l'API Supabase via les hooks useApi
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  MessageSquare,
  Eye,
  Copy,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List as ListIcon,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import { formatCurrency, formatRelativeDate, truncate } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useCampaigns, useCampaignMutations } from '@/hooks/useApi'

export function CampaignsPage() {
  // Chargement depuis l'API
  const { data: apiCampaigns, loading, error, refresh } = useCampaigns()
  const mutations = useCampaignMutations()
  const addToast = useStore((s) => s.addToast)

  const campaigns = apiCampaigns || []

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Loading state
  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement des campagnes...</p>
      </div>
    )
  }

  // Error state
  if (error && campaigns.length === 0) {
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

  // Filtrage et tri
  const filtered = useMemo(() => {
    return [...campaigns]
      .filter((c) => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || c.status === statusFilter
        return matchSearch && matchStatus
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [campaigns, search, statusFilter])

  const sentCount = campaigns.filter((c) => c.status === 'sent').length

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer la campagne "${name}" ?`)) return
    const result = await mutations.remove(id)
    if (result.error) {
      addToast({ type: 'error', title: 'Erreur', description: result.error })
    } else {
      addToast({ type: 'success', title: 'Campagne supprimée' })
    }
    refresh()
  }

  const handleDuplicate = async (id: number) => {
    const original = campaigns.find((c) => c.id === id)
    if (!original) return
    const result = await mutations.create({
      ...original,
      name: `${original.name} (copie)`,
      status: 'draft',
      scheduled_at: undefined,
      sent_at: undefined,
      completed_at: undefined,
      stats: undefined,
    } as any)
    if (result.error) {
      addToast({ type: 'error', title: 'Erreur', description: result.error })
    } else {
      addToast({ type: 'success', title: 'Campagne dupliquée' })
    }
    refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campagnes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {campaigns.length} campagne(s) • {sentCount} envoyée(s)
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
          <Link to="/campaigns/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Nouvelle campagne</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Rechercher une campagne..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Tous les statuts' },
                { value: 'draft', label: 'Brouillons' },
                { value: 'scheduled', label: 'Planifiées' },
                { value: 'sending', label: 'En cours' },
                { value: 'sent', label: 'Envoyées' },
                { value: 'failed', label: 'Échouées' },
              ]}
            />
            <div className="flex rounded-lg border border-slate-300 p-0.5">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  view === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  view === 'list' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title={search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucune campagne'}
            description={
              search || statusFilter !== 'all'
                ? 'Essayez d\'ajuster vos filtres.'
                : 'Créez votre première campagne SMS pour commencer.'
            }
            action={
              !search && statusFilter === 'all'
                ? { label: 'Nouvelle campagne', onClick: () => (window.location.href = '/campaigns/new') }
                : undefined
            }
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((camp) => (
            <CampaignCard
              key={camp.id}
              camp={camp}
              onDelete={() => handleDelete(camp.id, camp.name)}
              onDuplicate={() => handleDuplicate(camp.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Nom</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Envoyés</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Délivrés</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Coût</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((camp) => (
                  <tr key={camp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/campaigns/${camp.id}`}
                        className="font-medium text-slate-900 hover:text-primary-600"
                      >
                        {camp.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={camp.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{camp.stats?.total_sent || '—'}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">
                      {camp.stats ? `${camp.stats.delivery_rate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {camp.stats ? formatCurrency(camp.stats.total_cost) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {camp.sent_at ? formatRelativeDate(camp.sent_at) : formatRelativeDate(camp.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/campaigns/${camp.id}`}
                          className="rounded p-1.5 hover:bg-slate-100"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(camp.id)}
                          className="rounded p-1.5 hover:bg-slate-100"
                          title="Dupliquer"
                        >
                          <Copy className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(camp.id, camp.name)}
                          className="rounded p-1.5 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ====================== COMPONENTS ======================

function CampaignCard({
  camp,
  onDelete,
  onDuplicate,
}: {
  camp: any
  onDelete: () => void
  onDuplicate: () => void
}) {
  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <Badge status={camp.status} />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={onDuplicate}
              className="rounded p-1 hover:bg-slate-100"
              title="Dupliquer"
              aria-label="Dupliquer"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 hover:bg-red-50"
              title="Supprimer"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-2 line-clamp-2 min-h-[3rem]">
          {camp.name}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-3 mb-4 min-h-[3.6rem]">
          {truncate(camp.message, 120)}
        </p>

        {camp.stats ? (
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{camp.stats.total_sent}</p>
              <p className="text-[10px] text-slate-500 uppercase">Envoyés</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{camp.stats.delivery_rate}%</p>
              <p className="text-[10px] text-slate-500 uppercase">Délivrés</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{formatCurrency(camp.stats.total_cost)}</p>
              <p className="text-[10px] text-slate-500 uppercase">Coût</p>
            </div>
          </div>
        ) : (
          <div className="py-3 border-y border-slate-100 mb-3 text-center">
            <p className="text-xs text-slate-500">
              <Clock className="h-3 w-3 inline mr-1" />
              {camp.scheduled_at
                ? `Planifiée pour ${formatRelativeDate(camp.scheduled_at)}`
                : '📝 Brouillon non envoyé'}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            {camp.sent_at ? (
              <><Send className="h-3 w-3" />Envoyée {formatRelativeDate(camp.sent_at)}</>
            ) : camp.scheduled_at ? (
              <><Clock className="h-3 w-3" />{formatRelativeDate(camp.scheduled_at)}</>
            ) : (
              <>{formatRelativeDate(camp.created_at)}</>
            )}
          </span>
          <Link
            to={`/campaigns/${camp.id}`}
            className="font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Détails <Eye className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
