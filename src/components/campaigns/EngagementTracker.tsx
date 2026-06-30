import { Eye, MousePointerClick, MessageSquare, UserMinus, CheckCheck } from 'lucide-react'
import type { SMSLog } from '@/types'
import { cn } from '@/utils/cn'

interface EngagementStatsProps {
  logs: SMSLog[]
  variant?: 'cards' | 'funnel' | 'bars'
}

/**
 * Calcule les statistiques d'engagement à partir des SMS logs.
 *
 * Distinction des statuts Twilio :
 * - delivered : SMS confirmé reçu par l'opérateur (= équivalent "envoyé avec succès")
 * - "lu" : engagement via clic sur lien tracké (les SMS ne permettent pas le tracking de lecture natif)
 * - "cliqué" : clic sur un lien tracké
 * - "répondu" : réponse reçue du destinataire
 * - "désabonné" : STOP reçu
 */
export function computeEngagement(logs: SMSLog[]) {
  const total = logs.length
  const sent = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length
  const delivered = logs.filter((l) => l.status === 'delivered').length
  const failed = logs.filter((l) => l.status === 'failed' || l.status === 'undelivered').length
  const read = logs.filter((l) => l.engagement?.read_at).length
  const clicked = logs.filter((l) => l.engagement?.clicked_at).length
  const replied = logs.filter((l) => l.engagement?.replies && l.engagement.replies.length > 0).length
  const optedOut = logs.filter((l) => l.engagement?.replies?.some((r) => r.text.toUpperCase() === 'STOP')).length

  return {
    total,
    sent,
    delivered,
    failed,
    read,
    clicked,
    replied,
    optedOut,
    deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
    readRate: delivered > 0 ? (read / delivered) * 100 : 0,
    clickRate: read > 0 ? (clicked / read) * 100 : 0,
    replyRate: delivered > 0 ? (replied / delivered) * 100 : 0,
    optOutRate: delivered > 0 ? (optedOut / delivered) * 100 : 0,
  }
}

export function EngagementTracker({ logs, variant = 'cards' }: EngagementStatsProps) {
  const stats = computeEngagement(logs)

  if (variant === 'funnel') {
    const stages = [
      { label: 'Envoyés', value: stats.sent, color: 'bg-blue-500', icon: Send },
      { label: 'Délivrés', value: stats.delivered, color: 'bg-indigo-500', icon: CheckCheck },
      { label: 'Lus', value: stats.read, color: 'bg-emerald-500', icon: Eye, hint: 'via clic sur lien' },
      { label: 'Cliqués', value: stats.clicked, color: 'bg-purple-500', icon: MousePointerClick },
      { label: 'Répondus', value: stats.replied, color: 'bg-amber-500', icon: MessageSquare },
    ]
    return (
      <div className="space-y-3">
        {stages.map((stage) => {
          const Icon = stage.icon
          const pct = stats.sent > 0 ? (stage.value / stats.sent) * 100 : 0
          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', stage.color.replace('bg-', 'bg-').replace('-500', '-100'))}>
                    <Icon className={cn('h-3.5 w-3.5', stage.color.replace('bg-', 'text-').replace('-500', '-600'))} />
                  </div>
                  <span className="text-sm font-medium text-slate-900">{stage.label}</span>
                  {stage.hint && (
                    <span className="text-[10px] text-slate-400 italic">({stage.hint})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{stage.value}</span>
                  <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all', stage.color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <EngagementCard
        icon={Eye}
        label="Taux de lecture"
        value={`${stats.readRate.toFixed(1)}%`}
        subValue={`${stats.read} lus`}
        color="emerald"
      />
      <EngagementCard
        icon={MousePointerClick}
        label="Taux de clic"
        value={`${stats.clickRate.toFixed(1)}%`}
        subValue={`${stats.clicked} clics`}
        color="purple"
      />
      <EngagementCard
        icon={MessageSquare}
        label="Réponses"
        value={`${stats.replied}`}
        subValue={`${stats.replyRate.toFixed(1)}% ont répondu`}
        color="amber"
      />
      <EngagementCard
        icon={UserMinus}
        label="Désabonnements"
        value={`${stats.optedOut}`}
        subValue={`STOP reçus (${stats.optOutRate.toFixed(1)}%)`}
        color="red"
      />
    </div>
  )
}

function EngagementCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: any
  label: string
  value: string
  subValue: string
  color: 'emerald' | 'purple' | 'amber' | 'red' | 'blue'
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{subValue}</p>
    </div>
  )
}

// Fix import for Send icon
import { Send } from 'lucide-react'
