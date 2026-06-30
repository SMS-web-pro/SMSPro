/**
 * Coupons - Gestion des coupons promo
 * CRUD + test d'utilisation
 *
 * Connecté à l'API Supabase
 */

import { useState, useMemo } from 'react'
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Percent,
  DollarSign,
  Truck,
  Gift,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useCoupons, useCouponMutations, useContacts as useContactsApi } from '@/hooks/useApi'

const typeConfig = {
  percentage: { icon: Percent, label: 'Pourcentage', color: 'blue', example: '-20%' },
  fixed_amount: { icon: DollarSign, label: 'Montant fixe', color: 'emerald', example: '-5€' },
  free_shipping: { icon: Truck, label: 'Livraison offerte', color: 'purple', example: 'GRATUIT' },
  gift: { icon: Gift, label: 'Cadeau', color: 'amber', example: 'GIFT' },
}

export function CouponsPage() {
  // API réelle
  const { data: apiCoupons, loading, error, refresh } = useCoupons()
  const { data: apiContacts } = useContactsApi()
  const mutations = useCouponMutations()
  const addToast = useStore((s) => s.addToast)

  const coupons = apiCoupons || []
  const contacts = apiContacts || []

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [testCode, setTestCode] = useState('')
  const [testContactId, setTestContactId] = useState<number | null>(null)

  // Filtrage
  const filtered = useMemo(() => {
    const now = new Date()
    return coupons.filter((c: any) => {
      const matchSearch = !search ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      let matchStatus = true
      if (statusFilter === 'active') matchStatus = c.is_active && new Date(c.valid_until) > now
      else if (statusFilter === 'expired') matchStatus = new Date(c.valid_until) < now
      else if (statusFilter === 'inactive') matchStatus = !c.is_active
      return matchSearch && matchStatus
    })
  }, [coupons, search, statusFilter])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const active = coupons.filter((c: any) => c.is_active && new Date(c.valid_until) > now)
    return {
      total: coupons.length,
      active: active.length,
      totalUses: coupons.reduce((s: number, c: any) => s + (c.current_uses || 0), 0),
      totalRevenue: 0, // Simplifié
    }
  }, [coupons])

  // Loading state
  if (loading && coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement des coupons...</p>
      </div>
    )
  }

  if (error && coupons.length === 0) {
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

  const handleDelete = async (coupon: any) => {
    if (!confirm(`Supprimer le coupon "${coupon.code}" ?`)) return
    const result = await mutations.remove(coupon.id)
    if (result.error) {
      addToast({ type: 'error', title: 'Erreur', description: result.error })
    } else {
      addToast({ type: 'success', title: 'Coupon supprimé' })
    }
    refresh()
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      addToast({ type: 'success', title: 'Code copié !', description: code })
    } catch {
      addToast({ type: 'error', title: 'Erreur de copie' })
    }
  }

  const handleTestUse = async () => {
    if (!testCode || !testContactId) {
      addToast({ type: 'error', title: 'Sélectionnez un code et un contact' })
      return
    }

    // En démo on simule, en prod on utilise la RPC Supabase
    const coupon = coupons.find((c: any) => c.code === testCode.toUpperCase())
    if (coupon) {
      addToast({
        type: 'success',
        title: 'Coupon utilisé !',
        description: `${coupon.code} appliqué au contact`,
      })
      refresh()
    } else {
      addToast({ type: 'error', title: 'Code invalide' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-amber-500" />
            Coupons & Promotions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {coupons.length} coupon(s) • {stats.active} actif(s)
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
            Nouveau coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total coupons" value={stats.total} color="amber" />
        <StatBox label="Actifs" value={stats.active} color="emerald" />
        <StatBox label="Utilisations" value={stats.totalUses} color="blue" />
        <StatBox label="Revenu généré" value={formatCurrency(stats.totalRevenue)} color="purple" />
      </div>

      {/* Test zone */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">🧪 Tester l'utilisation d'un coupon</p>
              <p className="text-xs text-amber-700">Simulez une utilisation en sélectionnant un contact et un code</p>
            </div>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Code du coupon"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select
                value={testContactId?.toString() || ''}
                onChange={(e) => setTestContactId(Number(e.target.value))}
                options={[
                  { value: '', label: 'Sélectionner un contact...' },
                  ...contacts.slice(0, 50).map((c: any) => ({
                    value: c.id.toString(),
                    label: `${c.first_name} ${c.last_name}`,
                  })),
                ]}
              />
            </div>
            <Button onClick={handleTestUse}>
              Tester
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search & filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un coupon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'Tous les statuts' },
                { value: 'active', label: '✓ Actifs' },
                { value: 'expired', label: '⚠️ Expirés' },
                { value: 'inactive', label: '✗ Désactivés' },
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

      {/* Coupons list */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Ticket}
            title="Aucun coupon"
            description="Créez votre premier code promotionnel."
            action={{ label: 'Nouveau coupon', onClick: () => setShowCreate(true) }}
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((coupon: any) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onDelete={() => handleDelete(coupon)}
              onCopy={() => handleCopy(coupon.code)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Valeur</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Validité</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Utilisations</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <code className="font-mono font-bold text-sm bg-slate-100 px-2 py-1 rounded">
                        {c.code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info" size="sm">{typeConfig[c.type as keyof typeof typeConfig].label}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {c.type === 'percentage' ? `-${c.value}%` :
                       c.type === 'fixed_amount' ? `-${formatCurrency(c.value)}` :
                       c.type === 'free_shipping' ? 'OFFERT' : c.value}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      Jusqu'au {new Date(c.valid_until).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{c.current_uses}</span>
                      {c.max_uses && <span className="text-slate-500">/{c.max_uses}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <CouponStatusBadge coupon={c} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(c.code)}
                          className="rounded p-1.5 hover:bg-slate-100"
                          title="Copier"
                        >
                          <Copy className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
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

      {/* Create modal */}
      <CouponFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={async (data) => {
          const result = await mutations.create(data as any)
          if (result.error) {
            addToast({ type: 'error', title: 'Erreur', description: result.error })
          } else {
            addToast({ type: 'success', title: 'Coupon créé !' })
          }
          setShowCreate(false)
          refresh()
        }}
      />
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: any; color: 'amber' | 'emerald' | 'blue' | 'purple' }) {
  const colorMap = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <div className={cn('rounded-lg border p-3', colorMap[color])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function CouponCard({ coupon, onDelete, onCopy }: { coupon: any; onDelete: () => void; onCopy: () => void }) {
  const tc = typeConfig[coupon.type as keyof typeof typeConfig]
  const Icon = tc.icon
  const usagePercent = coupon.max_uses ? (coupon.current_uses / coupon.max_uses) * 100 : 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className={cn(
          'rounded-lg p-4 mb-4 relative overflow-hidden',
          tc.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
          tc.color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
          tc.color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-700' :
          'bg-gradient-to-br from-amber-500 to-orange-600'
        )}>
          <div className="absolute -right-4 -top-4 opacity-20">
            <Icon className="h-24 w-24 text-white" />
          </div>
          <div className="relative">
            <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
              {tc.label}
            </p>
            <p className="text-3xl font-bold text-white mt-1">
              {coupon.type === 'percentage' ? `-${coupon.value}%` :
               coupon.type === 'fixed_amount' ? `-${formatCurrency(coupon.value)}` :
               coupon.type === 'free_shipping' ? 'OFFERT' : coupon.value}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <code className="font-mono font-bold text-sm bg-slate-100 px-3 py-1.5 rounded border-2 border-dashed border-slate-300">
            {coupon.code}
          </code>
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        {coupon.description && (
          <p className="text-sm text-slate-700 mb-3 line-clamp-2">{coupon.description}</p>
        )}

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">Utilisations</span>
            <span className="font-semibold text-slate-900">
              {coupon.current_uses}{coupon.max_uses && ` / ${coupon.max_uses}`}
            </span>
          </div>
          {coupon.max_uses && (
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  usagePercent > 80 ? 'bg-amber-500' :
                  usagePercent > 50 ? 'bg-blue-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span>Jusqu'au {new Date(coupon.valid_until).toLocaleDateString('fr-BE')}</span>
          <CouponStatusBadge coupon={coupon} />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          fullWidth
        >
          Supprimer
        </Button>
      </CardContent>
    </Card>
  )
}

function CouponStatusBadge({ coupon }: { coupon: any }) {
  const now = new Date()
  const expired = new Date(coupon.valid_until) < now
  const exhausted = coupon.max_uses && coupon.current_uses >= coupon.max_uses
  if (!coupon.is_active) return <Badge variant="gray" size="sm">Désactivé</Badge>
  if (expired) return <Badge variant="danger" size="sm">Expiré</Badge>
  if (exhausted) return <Badge variant="warning" size="sm">Épuisé</Badge>
  return <Badge status="active" size="sm" />
}

function CouponFormModal({
  open: _open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping' | 'gift',
    value: 10,
    description: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    max_uses: '',
    per_contact_limit: 1,
    terms: '',
  })

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setForm({ ...form, code })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Nouveau coupon</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <Input
              label="Code *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="PROMO20"
            />
            <div className="flex items-end">
              <Button variant="outline" onClick={generateCode}>🎲 Générer</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              options={[
                { value: 'percentage', label: '% Pourcentage' },
                { value: 'fixed_amount', label: '€ Montant fixe' },
                { value: 'free_shipping', label: '🚚 Livraison offerte' },
                { value: 'gift', label: '🎁 Cadeau' },
              ]}
            />
            <Input
              label="Valeur"
              type="number"
              value={String(form.value)}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Black Friday 2024"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valide du"
              type="date"
              value={form.valid_from}
              onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
            />
            <Input
              label="Jusqu'au"
              type="date"
              value={form.valid_until}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            />
          </div>
          <Input
            label="Max utilisations (vide = illimité)"
            type="number"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => {
              if (!form.code) return
              onSave({
                code: form.code.toUpperCase(),
                type: form.type,
                value: form.value,
                description: form.description,
                valid_from: new Date(form.valid_from).toISOString(),
                valid_until: new Date(form.valid_until).toISOString(),
                max_uses: form.max_uses ? Number(form.max_uses) : undefined,
                per_contact_limit: form.per_contact_limit,
                terms: form.terms,
                is_active: true,
              })
            }}
            disabled={!form.code}
          >
            Créer
          </Button>
        </div>
      </div>
    </div>
  )
}
