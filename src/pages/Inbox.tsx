/**
 * Inbox - Boîte de réception SMS
 * Affiche les messages entrants (réponses des contacts) et sortants (campagnes)
 *
 * Connecté à l'API Supabase via les hooks useApi
 */

import { useState, useMemo } from 'react'
import {
  Inbox as InboxIcon,
  Send,
  Search,
  CheckCheck,
  Zap,
  Reply,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import { formatRelativeDate, formatPhoneInternational } from '@/lib/utils'
import { useInbox, useInboxMutations, useContacts, useSendSMS } from '@/hooks/useApi'

type Filter = 'all' | 'unread' | 'auto' | 'manual'

export function InboxPage() {
  // Chargement depuis l'API
  const { data: apiMessages, loading, error, refresh } = useInbox()
  const { data: apiContacts } = useContacts()
  const mutations = useInboxMutations()
  const addToast = useStore((s) => s.addToast)

  const messages = apiMessages || []
  const contacts = apiContacts || []

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const sendReply = useSendSMS()

  // Filtrage et tri
  const filteredMessages = useMemo(() => {
    let msgs = [...messages]
    if (filter === 'unread') msgs = msgs.filter((m) => !m.is_read && m.direction === 'inbound')
    if (filter === 'auto') msgs = msgs.filter((m) => m.direction === 'inbound' && m.auto_reply_sent)
    if (filter === 'manual') msgs = msgs.filter((m) => m.direction === 'inbound' && !m.auto_reply_sent)
    if (search) {
      msgs = msgs.filter(
        (m) =>
          m.phone.includes(search) || m.message.toLowerCase().includes(search.toLowerCase())
      )
    }
    return msgs.sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
  }, [messages, filter, search])

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement des messages...</p>
      </div>
    )
  }

  // Error state
  if (error && messages.length === 0) {
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

  const selected = messages.find((m) => m.id === selectedId)
  const selectedContact = selected ? contacts.find((c) => c.phone === selected.phone) : null
  const unreadCount = messages.filter((m) => !m.is_read && m.direction === 'inbound').length
  const autoReplyCount = messages.filter((m) => m.direction === 'inbound' && m.auto_reply_sent).length
  const manualCount = messages.filter((m) => m.direction === 'inbound' && !m.auto_reply_sent).length

  // Sélection + marquage lu
  const handleSelect = async (id: number) => {
    setSelectedId(id)
    const msg = messages.find((m) => m.id === id)
    if (msg && !msg.is_read && msg.direction === 'inbound') {
      await mutations.markRead(id)
      refresh()
    }
  }

  const handleMarkAll = async () => {
    for (const m of messages) {
      if (!m.is_read && m.direction === 'inbound') {
        await mutations.markRead(m.id)
      }
    }
    addToast({ type: 'success', title: 'Tous les messages marqués comme lus' })
    refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Boîte de réception</h1>
          <p className="text-sm text-slate-500 mt-1">
            Réponses SMS reçues de vos contacts • {unreadCount} non lues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            leftIcon={<CheckCheck className="h-4 w-4" />}
            disabled={unreadCount === 0}
          >
            Tout marquer comme lu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Reçues" value={messages.filter((m) => m.direction === 'inbound').length} icon={InboxIcon} color="blue" />
        <StatCard label="Non lues" value={unreadCount} icon={Reply} color="red" />
        <StatCard label="Auto-répondues" value={autoReplyCount} icon={Zap} color="emerald" />
        <StatCard label="À traiter" value={manualCount} icon={Phone} color="amber" />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des conversations */}
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="p-3">
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex border-t border-slate-200">
              <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="Toutes" />
              <FilterTab active={filter === 'unread'} onClick={() => setFilter('unread')} label="Non lues" badge={unreadCount} />
              <FilterTab active={filter === 'auto'} onClick={() => setFilter('auto')} label="Auto" />
              <FilterTab active={filter === 'manual'} onClick={() => setFilter('manual')} label="Manuel" />
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <EmptyState
                icon={InboxIcon}
                title="Aucun message"
                description="Les réponses SMS apparaîtront ici."
              />
            ) : (
              filteredMessages.map((msg) => {
                const contact = contacts.find((c) => c.phone === msg.phone)
                const isOutbound = msg.direction === 'outbound'
                return (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg.id)}
                    className={cn(
                      'w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
                      selectedId === msg.id && 'bg-primary-50/50',
                      !msg.is_read && !isOutbound && 'bg-blue-50/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 text-xs font-semibold',
                          isOutbound
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
                        )}
                      >
                        {isOutbound ? (
                          <Send className="h-4 w-4" />
                        ) : (
                          `${contact?.first_name?.[0] || ''}${contact?.last_name?.[0] || ''}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p
                            className={cn(
                              'text-sm truncate',
                              !msg.is_read && !isOutbound
                                ? 'font-bold text-slate-900'
                                : 'font-medium text-slate-700'
                            )}
                          >
                            {contact
                              ? `${contact.first_name} ${contact.last_name}`
                              : msg.phone}
                          </p>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {formatRelativeDate(msg.received_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {msg.keyword_detected && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold">
                              <Zap className="h-2.5 w-2.5" />
                              {msg.keyword_detected}
                            </span>
                          )}
                          {msg.auto_reply_sent && !isOutbound && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium">
                              <Zap className="h-2.5 w-2.5" />
                              Auto
                            </span>
                          )}
                          {isOutbound && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium">
                              <Send className="h-2.5 w-2.5" />
                              Sortant
                            </span>
                          )}
                          {!msg.is_read && !isOutbound && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{msg.message}</p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Card>

        {/* Detail */}
        <Card className="lg:col-span-2">
          {!selected ? (
            <EmptyState
              icon={InboxIcon}
              title="Sélectionnez une conversation"
              description="Choisissez un message pour voir les détails."
            />
          ) : (
            <div className="flex flex-col h-full min-h-[500px]">
              {/* Header */}
              <div className="border-b border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0',
                      selected.direction === 'outbound'
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
                    )}
                  >
                    {selected.direction === 'outbound' ? (
                      <Send className="h-4 w-4" />
                    ) : selectedContact ? (
                      `${selectedContact.first_name?.[0]}${selectedContact.last_name?.[0]}`
                    ) : (
                      '?'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {selectedContact
                        ? `${selectedContact.first_name} ${selectedContact.last_name}`
                        : 'Contact inconnu'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="h-3 w-3" />
                      <span>{formatPhoneInternational(selected.phone)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selected.direction === 'inbound' && (
                    <Button
                      size="sm"
                      leftIcon={<Reply className="h-3.5 w-3.5" />}
                      onClick={() => {
                        addToast({
                          type: 'info',
                          title: 'Réponse rapide',
                          description: 'Sélectionnez un message et utilisez le champ de réponse en dessous',
                        })
                      }}
                    >
                      Répondre
                    </Button>
                  )}
                  <button
                    className="rounded p-1.5 hover:bg-slate-100"
                    aria-label="Plus d'options"
                  >
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Auto-reply banner */}
              {selected.auto_reply_sent && (
                <div className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-900">
                        Auto-répondeur déclenché
                        {selected.keyword_detected && (
                          <code className="ml-1 px-1 py-0.5 rounded bg-emerald-100">
                            {selected.keyword_detected}
                          </code>
                        )}
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Réponse automatique envoyée au destinataire.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
                <div
                  className={cn(
                    'flex',
                    selected.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm',
                      selected.direction === 'outbound'
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1',
                        selected.direction === 'outbound'
                          ? 'text-primary-100'
                          : 'text-slate-500'
                      )}
                    >
                      {formatRelativeDate(selected.received_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reply box (for inbound only) */}
              {selected.direction === 'inbound' && (
                <div className="border-t border-slate-200 p-4 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      placeholder="Tapez votre réponse..."
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
                    />
                    <Button
                      leftIcon={<Send className="h-4 w-4" />}
                      onClick={async () => {
                        if (!replyText.trim() || !selected) return
                        const contact = contacts.find(c => c.phone === selected.phone)
                        if (!contact) {
                          addToast({ type: 'error', title: 'Contact non trouvé', description: 'Ce numéro n\'est pas dans vos contacts' })
                          return
                        }
                        await sendReply([contact.id], replyText.trim())
                        setReplyText('')
                        refresh()
                      }}
                    >
                      Envoyer
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    💡 Vous pouvez aussi configurer un auto-répondeur pour ce mot-clé dans la section dédiée
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ====================== HELPERS ======================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: any
  color: 'blue' | 'red' | 'emerald' | 'amber'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

function FilterTab({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors relative',
        active
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      )}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
          {badge}
        </span>
      )}
    </button>
  )
}
