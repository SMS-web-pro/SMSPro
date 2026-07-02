/**
 * Dashboard - Page principale
 * Affiche KPIs, graphique d'évolution, dernières campagnes
 *
 * Connecté à l'API Supabase via les hooks useApi
 */

import { Link } from 'react-router-dom'
import {
  Users,
  Send,
  CheckCircle2,
  Wallet,
  Plus,
  Upload,
  BarChart3,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  MessageSquare,
  UserMinus,
  MousePointerClick,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber, formatRelativeDate } from '@/lib/utils'
import { useDashboardStats, useCampaigns, useTimeline } from '@/hooks/useApi'

export function DashboardPage() {
  // Chargement depuis l'API
  const { data: statsData, loading: loadingStats, error: errorStats, refresh: refreshStats } = useDashboardStats()
  const { data: apiCampaigns, loading: loadingCampaigns, refresh: refreshCampaigns } = useCampaigns()
  const { data: timelineData, refresh: refreshTimeline } = useTimeline()

  const campaigns = apiCampaigns || []
  const stats = statsData || {
    totalContacts: 0,
    activeContacts: 0,
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalCost: 0,
    deliveryRate: 0,
    totalRead: 0,
    totalClicked: 0,
    totalReplied: 0,
    totalOptOut: 0,
  }

  // Loading state
  if ((loadingStats || loadingCampaigns) && !statsData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement du tableau de bord...</p>
      </div>
    )
  }

  // Error state
  if (errorStats) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700 mb-3">Erreur de chargement : {errorStats}</p>
          <Button onClick={refreshStats} size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  const recentCampaigns = [...campaigns]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Engagement réel depuis les données
  const totalRead = stats.totalRead || 0
  const totalClicked = stats.totalClicked || 0
  const totalReplied = stats.totalReplied || 0
  const totalOptOut = stats.totalOptOut || 0

  // Stats cards
  const statCards = [
    {
      title: 'Contacts actifs',
      value: formatNumber(stats.activeContacts),
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Campagnes créées',
      value: formatNumber(stats.totalCampaigns),
      icon: Send,
      color: 'green',
    },
    {
      title: 'Taux de délivrance',
      value: stats.totalSent > 0 ? `${stats.deliveryRate}%` : '—',
      icon: CheckCircle2,
      color: 'purple',
    },
    {
      title: 'Coût total',
      value: formatCurrency(stats.totalCost),
      icon: Wallet,
      color: 'orange',
    },
  ]

  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-1">
            {stats.totalContacts === 0
              ? 'Bienvenue ! Commencez par importer vos contacts.'
              : 'Voici un aperçu de votre activité SMS.'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refreshStats()
            refreshCampaigns()
            refreshTimeline()
          }}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Actualiser
        </Button>
      </div>

      {/* Onboarding banner */}
      {stats.totalContacts === 0 && campaigns.length === 0 && (
        <Card className="bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white flex-shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Démarrez en 3 étapes</h3>
                <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside mb-3">
                  <li>Importez vos contacts (CSV ou manuellement)</li>
                  <li>Configurez Twilio dans les paramètres</li>
                  <li>Créez votre première campagne SMS</li>
                </ol>
                <Link to="/contacts?action=import">
                  <Button size="sm">Importer mes premiers contacts</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const c = colorMap[stat.color]
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                    <Icon className={`h-5 w-5 ${c.icon}`} />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/campaigns/new" className="block">
          <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 group-hover:bg-primary-100">
              <Plus className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Nouvelle campagne</p>
              <p className="text-xs text-slate-500">Créer et envoyer un SMS</p>
            </div>
          </div>
        </Link>
        <Link to="/contacts?action=import" className="block">
          <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 group-hover:bg-emerald-100">
              <Upload className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Importer contacts</p>
              <p className="text-xs text-slate-500">Depuis un fichier CSV</p>
            </div>
          </div>
        </Link>
        <Link to="/analytics" className="block">
          <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 group-hover:bg-purple-100">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Voir analytics</p>
              <p className="text-xs text-slate-500">Rapports détaillés</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Engagement global */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              Engagement global
            </h3>
            <p className="text-xs text-slate-500">Basé sur les SMS délivrés</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <EngagementMini
              label="Taux de lecture"
              value={stats.totalDelivered > 0
                ? `${((totalRead / stats.totalDelivered) * 100).toFixed(1)}%`
                : '—'}
              sub={`${totalRead} SMS lus`}
              icon={Eye}
              color="emerald"
            />
            <EngagementMini
              label="Taux de clic"
              value={totalRead > 0
                ? `${((totalClicked / totalRead) * 100).toFixed(1)}%`
                : '—'}
              sub={`${totalClicked} clics`}
              icon={MousePointerClick}
              color="purple"
            />
            <EngagementMini
              label="Réponses"
              value={`${totalReplied}`}
              sub={`${stats.totalDelivered > 0
                ? `${((totalReplied / stats.totalDelivered) * 100).toFixed(1)}% ont répondu`
                : '—'}`}
              icon={MessageSquare}
              color="amber"
            />
            <EngagementMini
              label="Désabonnements"
              value={`${totalOptOut}`}
              sub={`STOP reçus (${stats.totalDelivered > 0
                ? ((totalOptOut / stats.totalDelivered) * 100).toFixed(2)
                : '0'}%)`}
              icon={UserMinus}
              color="red"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Évolution des envois (30j)</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-primary-500" />
                  <span className="text-slate-600">Envoyés</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-slate-600">Délivrés</span>
                </div>
              </div>
            </div>
            <ChartArea data={timelineData || []} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Campagnes récentes</h3>
              <Link to="/campaigns" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Voir tout
              </Link>
            </div>
            {recentCampaigns.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Aucune campagne</p>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((camp) => (
                  <Link
                    key={camp.id}
                    to={`/campaigns/${camp.id}`}
                    className="block rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{camp.name}</p>
                      <Badge status={camp.status} size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{camp.sent_at ? formatRelativeDate(camp.sent_at) : formatRelativeDate(camp.created_at)}</span>
                      {camp.stats && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <TrendingUp className="h-3 w-3" />
                          {camp.stats.delivery_rate}%
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Twilio status banner */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  {stats.totalSent > 0
                    ? `${stats.totalSent} SMS envoyés ce mois`
                    : 'Prêt à envoyer votre première campagne'}
                </p>
                <p className="text-xs text-emerald-700">
                  {stats.totalSent > 0 && `Taux de délivrance ${stats.deliveryRate}%`}
                </p>
              </div>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                Gérer Twilio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChartArea({ data }: { data: Array<{ date: string; sent: number; delivered: number }> }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v) => new Date(v).getDate().toString()}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(v) => new Date(v).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
          />
          <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSent)" />
          <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fill="url(#colorDelivered)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function EngagementMini({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub: string
  icon: any
  color: 'emerald' | 'purple' | 'amber' | 'red'
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[11px] font-medium text-slate-600">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}
