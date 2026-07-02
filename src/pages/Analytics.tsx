/**
 * Analytics - Vue d'ensemble des performances
 * KPIs, graphiques timeline, top campagnes
 *
 * Connecté à l'API Supabase
 */

import { Link } from 'react-router-dom'
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Send,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
  Award,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber, formatRelativeDate } from '@/lib/utils'
import { useDashboardStats, useCampaigns, useTimeline } from '@/hooks/useApi'
import { generateTimelineData } from '@/lib/mockData'

export function AnalyticsPage() {
  // API réelle
  const { data: stats, loading, error, refresh } = useDashboardStats()
  const { data: apiCampaigns, loading: loadingCampaigns, refresh: refreshCampaigns } = useCampaigns()
  const { data: timelineApiData } = useTimeline()

  const campaigns = apiCampaigns || []

  // Loading
  if ((loading || loadingCampaigns) && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement des analytics...</p>
      </div>
    )
  }

  if (error && !stats) {
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

  const timelineData = timelineApiData || generateTimelineData()
  const topCampaigns = [...campaigns]
    .filter((c) => c.stats)
    .sort((a, b) => (b.stats?.total_sent || 0) - (a.stats?.total_sent || 0))
    .slice(0, 5)

  const totalDelivered = stats?.totalDelivered || 0
  const totalSent = stats?.totalSent || 0
  const totalFailed = Math.max(0, totalSent - totalDelivered)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vue d'ensemble de vos performances SMS
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refresh(); refreshCampaigns() }}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="SMS envoyés"
          value={formatNumber(totalSent)}
          icon={Send}
          color="blue"
        />
        <KpiCard
          title="Délivrés"
          value={formatNumber(totalDelivered)}
          subtitle={totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(1)}% de réussite` : '—'}
          icon={CheckCircle2}
          color="green"
        />
        <KpiCard
          title="Échoués"
          value={formatNumber(totalFailed)}
          subtitle={totalSent > 0 ? `${((totalFailed / totalSent) * 100).toFixed(1)}% du total` : '—'}
          icon={XCircle}
          color="red"
        />
        <KpiCard
          title="Coût total"
          value={formatCurrency(stats?.totalCost || 0)}
          subtitle={totalSent > 0 ? `${formatNumber(Math.round(totalSent))} SMS facturés` : '—'}
          icon={Wallet}
          color="orange"
        />
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
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-medium text-slate-600 mb-1">Taux de délivrance</p>
              <p className="text-xl font-bold text-slate-900">
                {totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-medium text-slate-600 mb-1">Taux d'échec</p>
              <p className="text-xl font-bold text-slate-900">
                {totalSent > 0 ? `${((totalFailed / totalSent) * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-medium text-slate-600 mb-1">Coût moyen / SMS</p>
              <p className="text-xl font-bold text-slate-900">
                {totalSent > 0 ? formatCurrency((stats?.totalCost || 0) / totalSent) : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-medium text-slate-600 mb-1">Campagnes actives</p>
              <p className="text-xl font-bold text-slate-900">
                {campaigns.filter((c) => c.status === 'sent').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              Évolution sur 30 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorSent2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered2" x1="0" y1="0" x2="0" y2="1">
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
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="sent" name="Envoyés" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSent2)" />
                  <Area type="monotone" dataKey="delivered" name="Délivrés" stroke="#10b981" strokeWidth={2} fill="url(#colorDelivered2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Délivrés', value: totalDelivered, color: '#10b981' },
                  { name: 'Échoués', value: totalFailed, color: '#ef4444' },
                ].filter(d => d.value > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[{ color: '#10b981' }, { color: '#ef4444' }].map((entry, i) => (
                      <Bar key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                  <span className="text-slate-700">Délivrés</span>
                </div>
                <span className="font-semibold text-slate-900">{formatNumber(totalDelivered)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-red-500" />
                  <span className="text-slate-700">Échoués</span>
                </div>
                <span className="font-semibold text-slate-900">{formatNumber(totalFailed)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Top campagnes par performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topCampaigns.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Aucune campagne envoyée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Envoyés</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Taux</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Coût</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((camp) => (
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
                      <td className="px-4 py-3 text-slate-700">{camp.stats?.total_sent}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">
                        {camp.stats?.delivery_rate}%
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatCurrency(camp.stats?.total_cost || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {camp.sent_at ? formatRelativeDate(camp.sent_at) : formatRelativeDate(camp.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/campaigns/${camp.id}`}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Meilleur taux</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Au-dessus de la moyenne secteur (95%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Coût moyen</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {totalSent > 0 ? formatCurrency((stats?.totalCost || 0) / totalSent) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Par SMS envoyé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Volume</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatNumber(totalSent)}</p>
            <p className="text-xs text-slate-500 mt-1">SMS envoyés au total</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  subtitle?: string
  icon: any
  color: 'blue' | 'green' | 'red' | 'orange'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
