import { useState, useMemo } from 'react'
import {
  Zap,
  Plus,
  Search,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  MessageSquare,
  Tag,
  UserMinus,
  Gift,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import type { AutoReplyRule, AutoReplyAction } from '@/types'
import { useAutoReplyRules, useAutoReplyMutations } from '@/hooks/useApi'

const KEYWORD_SUGGESTIONS = [
  { keyword: 'STOP', desc: 'Désabonnement (RGPD obligatoire)', color: 'red' },
  { keyword: 'START', desc: 'Réinscription rapide', color: 'green' },
  { keyword: 'OUI', desc: 'Confirmation / Intéressé', color: 'blue' },
  { keyword: 'NON', desc: 'Refus / Pas intéressé', color: 'gray' },
  { keyword: 'INFO', desc: 'Plus d\'informations', color: 'blue' },
  { keyword: 'RDV', desc: 'Prise de rendez-vous', color: 'purple' },
  { keyword: 'PROMO', desc: 'Code promo / Coupon', color: 'amber' },
  { keyword: 'AIDE', desc: 'Support / Assistance', color: 'cyan' },
]

export function AutoReplyPage() {
  // API réelle
  const { data: apiRules, refresh } = useAutoReplyRules()
  const mutations = useAutoReplyMutations()
  const autoReplyRules = apiRules || []

  const [search, setSearch] = useState('')
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    return autoReplyRules.filter((r) =>
      r.keyword.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    )
  }, [autoReplyRules, search])

  const stats = useMemo(() => {
    return {
      total: autoReplyRules.length,
      active: autoReplyRules.filter((r) => r.is_active).length,
      triggers: autoReplyRules.reduce((s, r) => s + r.trigger_count, 0),
      withActions: autoReplyRules.filter((r) => r.actions && r.actions.length > 0).length,
    }
  }, [autoReplyRules])

  const handleToggle = async (rule: AutoReplyRule) => {
    await mutations.update(rule.id, { is_active: !rule.is_active })
    refresh()
  }

  const handleDelete = async (rule: AutoReplyRule) => {
    if (!confirm(`Supprimer la règle "${rule.keyword}" ?`)) return
    await mutations.remove(rule.id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Auto-répondeurs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configurez des réponses automatiques pour les mots-clés reçus par SMS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => refresh()}>
            Actualiser
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Nouvelle règle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Règles actives" value={stats.active} sub={`sur ${stats.total} au total`} icon={Zap} color="amber" />
        <StatBox label="Déclenchements (30j)" value={stats.triggers} sub="Réponses automatiques envoyées" icon={MessageSquare} color="blue" />
        <StatBox label="Avec actions" value={stats.withActions} sub="Tag, opt-out, coupon..." icon={Sparkles} color="purple" />
        <StatBox label="Mots-clés système" value={2} sub="STOP & START (RGPD)" icon={CheckCircle2} color="green" />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Rechercher une règle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Mots-clés recommandés</p>
              <p className="text-xs text-amber-700">Cliquez pour créer rapidement une règle avec ce mot-clé</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {KEYWORD_SUGGESTIONS.map((s) => (
              <button
                key={s.keyword}
                onClick={() => {
                  setShowCreate(true)
                  setTimeout(() => {
                    const ta = document.querySelector('input[name="keyword"]') as HTMLInputElement
                    if (ta) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
                      nativeInputValueSetter?.call(ta, s.keyword)
                      ta.dispatchEvent(new Event('input', { bubbles: true }))
                    }
                  }, 100)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-200 px-3 py-1.5 text-xs font-medium hover:bg-amber-50 hover:border-amber-300 transition-colors"
              >
                <Hash className="h-3 w-3 text-amber-600" />
                {s.keyword}
                <span className="text-slate-500">·</span>
                <span className="text-slate-600 font-normal">{s.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules list */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Zap}
            title="Aucune règle"
            description="Configurez votre première règle d'auto-réponse."
            action={{ label: 'Nouvelle règle', onClick: () => setShowCreate(true) }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((rule) => (
            <Card key={rule.id} className={cn(
              'transition-all hover:shadow-md',
              !rule.is_active && 'opacity-60'
            )}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      rule.is_active ? 'bg-amber-100' : 'bg-slate-100'
                    )}>
                      <Hash className={cn('h-5 w-5', rule.is_active ? 'text-amber-600' : 'text-slate-400')} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="px-2 py-0.5 rounded bg-slate-100 text-sm font-bold text-slate-900">
                          {rule.keyword}
                        </code>
                        <Badge variant={rule.match_type === 'exact' ? 'info' : 'gray'} size="sm">
                          {rule.match_type === 'exact' ? 'Exact' : rule.match_type === 'contains' ? 'Contient' : 'Commence par'}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(rule)}
                    className={cn(
                      'rounded p-1.5',
                      rule.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                    )}
                    aria-label={rule.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {rule.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </button>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-900 line-clamp-3">
                      {rule.response_message}
                    </p>
                  </div>
                </div>

                {rule.actions && rule.actions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Actions automatiques</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.actions.map((action: AutoReplyAction, i: number) => (
                        <ActionBadge key={i} action={action} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-slate-500">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-semibold text-slate-900">{rule.trigger_count}</span>
                      <span>déclenchements</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="rounded p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50"
                      aria-label="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="rounded p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <RuleFormModal
        open={showCreate || editingRule !== null}
        rule={editingRule}
        onClose={() => {
          setShowCreate(false)
          setEditingRule(null)
        }}
        onSave={async (data) => {
          if (editingRule) {
            await mutations.update(editingRule.id, data)
          } else {
            await mutations.create(data)
          }
          setShowCreate(false)
          setEditingRule(null)
          refresh()
        }}
      />
    </div>
  )
}

function ActionBadge({ action }: { action: AutoReplyAction }) {
  let icon: any = ArrowRight
  let label = ''
  let color = 'bg-slate-50 text-slate-700 border-slate-200'

  switch (action.type) {
    case 'opt_in':
      icon = action.value ? CheckCircle2 : XCircle
      label = action.value ? 'Ré-activer le contact' : 'Désabonner le contact'
      color = action.value ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
      break
    case 'add_tag':
      icon = Tag
      label = `Tag +"${action.tag}"`
      color = 'bg-blue-50 text-blue-700 border-blue-200'
      break
    case 'remove_tag':
      icon = Tag
      label = `Tag -"${action.tag}"`
      color = 'bg-slate-50 text-slate-700 border-slate-200'
      break
    case 'send_coupon':
      icon = Gift
      label = 'Envoyer coupon'
      color = 'bg-amber-50 text-amber-700 border-amber-200'
      break
    case 'send_invitation':
      icon = Sparkles
      label = 'Envoyer invitation'
      color = 'bg-purple-50 text-purple-700 border-purple-200'
      break
    case 'webhook':
      icon = ArrowRight
      label = 'Webhook'
      color = 'bg-slate-50 text-slate-700 border-slate-200'
      break
  }

  const Icon = icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium', color)}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

function StatBox({ label, value, sub, icon: Icon, color }: { label: string; value: number; sub: string; icon: any; color: 'amber' | 'blue' | 'purple' | 'green' }) {
  const colorMap = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

function RuleFormModal({
  open,
  rule,
  onClose,
  onSave,
}: {
  open: boolean
  rule: AutoReplyRule | null
  onClose: () => void
  onSave: (data: Omit<AutoReplyRule, 'id' | 'trigger_count' | 'created_at' | 'updated_at'>) => void
}) {
  const [keyword, setKeyword] = useState(rule?.keyword || '')
  const [matchType, setMatchType] = useState(rule?.match_type || 'exact')
  const [responseMessage, setResponseMessage] = useState(rule?.response_message || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [isActive, setIsActive] = useState(rule?.is_active ?? true)
  const [caseSensitive, setCaseSensitive] = useState(rule?.case_sensitive ?? false)
  const [actions, setActions] = useState<AutoReplyAction[]>(rule?.actions || [])

  // Reset on open
  useMemo(() => {
    setKeyword(rule?.keyword || '')
    setMatchType(rule?.match_type || 'exact')
    setResponseMessage(rule?.response_message || '')
    setDescription(rule?.description || '')
    setIsActive(rule?.is_active ?? true)
    setCaseSensitive(rule?.case_sensitive ?? false)
    setActions(rule?.actions || [])
  }, [rule, open])

  const handleSubmit = () => {
    if (!keyword.trim()) return
    if (!responseMessage.trim()) return
    onSave({
      user_id: 'user-1',
      keyword: keyword.trim().toUpperCase(),
      match_type: matchType,
      response_message: responseMessage,
      description,
      is_active: isActive,
      case_sensitive: caseSensitive,
      actions,
    })
  }

  const toggleAction = (action: AutoReplyAction) => {
    setActions((prev) => {
      const exists = prev.find((a) => a.type === action.type)
      if (exists) return prev.filter((a) => a.type !== action.type)
      return [...prev, action]
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Modifier la règle' : 'Nouvelle règle d\'auto-réponse'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Mot-clé *"
            name="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value.toUpperCase())}
            placeholder="STOP"
            helperText="Le mot que le contact enverra"
          />
          <Select
            label="Type de correspondance"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as any)}
            options={[
              { value: 'exact', label: 'Correspondance exacte' },
              { value: 'contains', label: 'Contient le mot-clé' },
              { value: 'starts_with', label: 'Commence par' },
            ]}
          />
        </div>

        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Désabonnement RGPD obligatoire"
        />

        <Textarea
          label="Message de réponse *"
          value={responseMessage}
          onChange={(e) => setResponseMessage(e.target.value)}
          placeholder="Vous avez été désabonné. Pour vous réinscrire, envoyez START."
          rows={4}
          helperText={`${responseMessage.length} caractères · ${Math.ceil(responseMessage.length / 160) || 1} SMS`}
        />

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-900 mb-3">Actions automatiques</p>
          <div className="space-y-2">
            <ActionToggle
              label="Désactiver les SMS (opt-out)"
              description="Marquer le contact comme désabonné (RGPD)"
              checked={!!actions.find((a) => a.type === 'opt_in' && a.value === false)}
              onChange={() => toggleAction({ type: 'opt_in', value: false })}
              icon={UserMinus}
              color="red"
            />
            <ActionToggle
              label="Envoyer un coupon"
              description="Joindre automatiquement un code promo"
              checked={!!actions.find((a) => a.type === 'send_coupon')}
              onChange={() => toggleAction({ type: 'send_coupon' })}
              icon={Gift}
              color="amber"
            />
            <ActionToggle
              label="Ajouter un tag"
              description="Ex: 'engaged', 'interested'..."
              checked={!!actions.find((a) => a.type === 'add_tag')}
              onChange={() => toggleAction({ type: 'add_tag', tag: 'engaged' })}
              icon={Tag}
              color="blue"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Sensible à la casse</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-700">Règle active</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                isActive ? 'bg-primary-600' : 'bg-slate-300'
              )}
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm', isActive ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </label>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Aperçu</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-slate-700 text-xs font-semibold flex-shrink-0">U</div>
              <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900">
                {keyword || 'MOT-CLÉ'}
              </div>
            </div>
            <div className="flex items-start gap-2 justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-blue-500 text-white px-3 py-2 text-xs max-w-[80%]">
                {responseMessage || 'Votre réponse automatique...'}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xs flex-shrink-0">
                <Zap className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={!keyword.trim() || !responseMessage.trim()}>
          {rule ? 'Enregistrer' : 'Créer la règle'}
        </Button>
      </div>
    </Modal>
  )
}

function ActionToggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  color,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  icon: any
  color: 'red' | 'amber' | 'blue'
}) {
  const colorMap = {
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-lg border-2 transition-colors text-left',
        checked ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className={cn(
        'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0',
        checked ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
      )}>
        {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
      </div>
    </button>
  )
}
