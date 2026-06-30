import { useMemo, useState } from 'react'
import {
  Plus,
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  Tag,
  X,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Contact } from '@/types'
import { cn } from '@/utils/cn'
import { formatRelativeDate } from '@/lib/utils'
import { formatPhoneInternational, validatePhoneInternational, getCountryDisplay } from '@/lib/intlPhone'
import { useContacts, useContactMutations } from '@/hooks/useApi'

export function ContactsPage() {
  // Chargement depuis l'API réelle (ou mode démo)
  const { data: apiContacts, loading, error, refresh } = useContacts()
  const contacts = apiContacts || []
  const mutations = useContactMutations()

  // États UI (sélection, filtres, pagination)
  const selectedContacts = useStore((s) => s.selectedContacts)
  const toggleContactSelection = useStore((s) => s.toggleContactSelection)
  const toggleAllContacts = useStore((s) => s.toggleAllContacts)
  const setSelectedContacts = useStore((s) => s.setSelectedContacts)
  const addToast = useStore((s) => s.addToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'opted_out'>('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'phone' | 'city' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Cities uniques pour le filtre
  const cities = useMemo(() => {
    const set = new Set(contacts.map((c) => c.city).filter(Boolean))
    return Array.from(set).sort() as string[]
  }, [contacts])

  // Filtrage et tri
  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => {
      const matchesSearch =
        !search ||
        c.phone.includes(search.replace(/\s/g, '')) ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.opted_in) ||
        (statusFilter === 'opted_out' && !c.opted_in)
      const matchesCity = cityFilter === 'all' || c.city === cityFilter
      return matchesSearch && matchesStatus && matchesCity
    })

    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      } else if (sortBy === 'phone') {
        cmp = a.phone.localeCompare(b.phone)
      } else if (sortBy === 'city') {
        cmp = (a.city || '').localeCompare(b.city || '')
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [contacts, search, statusFilter, cityFilter, sortBy, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize))
  const paginatedContacts = filteredContacts.slice((page - 1) * pageSize, page * pageSize)
  const pageIds = paginatedContacts.map((c) => c.id)

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return
    if (!confirm(`Supprimer ${selectedContacts.length} contact(s) ?`)) return
    // Suppression en masse
    for (const id of selectedContacts) {
      await mutations.remove(id)
    }
    addToast({ type: 'success', title: `${selectedContacts.length} contact(s) supprimé(s)` })
    setSelectedContacts([])
    refresh()
  }

  const handleExport = () => {
    const toExport = selectedContacts.length > 0
      ? contacts.filter((c) => selectedContacts.includes(c.id))
      : filteredContacts
    const headers = ['Prénom', 'Nom', 'Téléphone', 'Email', 'Ville', 'Opt-in', 'Tags']
    const rows = toExport.map((c) => [
      c.first_name || '',
      c.last_name || '',
      c.phone,
      c.email || '',
      c.city || '',
      c.opted_in ? 'oui' : 'non',
      c.tags.join(','),
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', title: `${toExport.length} contacts exportés` })
  }

  const allSelected = paginatedContacts.length > 0 && pageIds.every((id) => selectedContacts.includes(id))

  if (loading && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-slate-500">Chargement des contacts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700">{error}</p>
          <Button onClick={refresh} className="mt-3" size="sm">Réessayer</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredContacts.length} contact(s) • {contacts.filter((c) => c.opted_in).length} actifs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setShowImportModal(true)}>
            Importer CSV
          </Button>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
            Ajouter contact
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Rechercher par nom, téléphone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="md" leftIcon={<Filter className="h-4 w-4" />} onClick={() => setShowFilters(!showFilters)}>
                Filtres
                {(statusFilter !== 'all' || cityFilter !== 'all') && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white">
                    {(statusFilter !== 'all' ? 1 : 0) + (cityFilter !== 'all' ? 1 : 0)}
                  </span>
                )}
              </Button>
              {(statusFilter !== 'all' || cityFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all')
                    setCityFilter('all')
                  }}
                >
                  Réinitialiser
                </Button>
              )}
              <Button variant="outline" size="md" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
                Exporter
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
              <Select
                label="Statut"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: 'Tous les statuts' },
                  { value: 'active', label: 'Actifs uniquement' },
                  { value: 'opted_out', label: 'Désabonnés' },
                ]}
              />
              <Select
                label="Ville"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Toutes les villes' },
                  ...cities.map((c) => ({ value: c, label: c })),
                ]}
              />
              <div className="flex items-end">
                <p className="text-xs text-slate-500">
                  💡 Affinez votre recherche pour des résultats précis
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedContacts.length > 0 && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-semibold">
              {selectedContacts.length}
            </div>
            <p className="text-sm font-medium text-primary-900">
              {selectedContacts.length} contact(s) sélectionné(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" leftIcon={<Tag className="h-3.5 w-3.5" />}>
              Ajouter tags
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Exporter
            </Button>
            <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={handleDeleteSelected}>
              Supprimer
            </Button>
            <button
              onClick={() => setSelectedContacts([])}
              className="rounded p-1 hover:bg-primary-100"
              aria-label="Annuler la sélection"
            >
              <X className="h-4 w-4 text-primary-700" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        {filteredContacts.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Aucun contact trouvé"
            description={
              search
                ? 'Aucun résultat ne correspond à votre recherche.'
                : 'Commencez par importer des contacts ou ajoutez-les manuellement.'
            }
            action={
              !search
                ? { label: 'Ajouter un contact', onClick: () => setShowAddModal(true) }
                : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleAllContacts(pageIds)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        aria-label="Tout sélectionner"
                      />
                    </th>
                    <SortHeader label="Nom" field="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Téléphone" field="phone" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                    <SortHeader label="Ville" field="city" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                    <SortHeader label="Ajouté" field="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                        selectedContacts.includes(contact.id) && 'bg-primary-50/50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          aria-label={`Sélectionner ${contact.first_name} ${contact.last_name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 text-xs font-semibold">
                            {(contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {contact.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {contact.tags.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">{getCountryDisplay(contact.phone).split(' ')[0]}</span>
                          <span>{formatPhoneInternational(contact.phone)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">
                        {contact.email || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{contact.city || <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3">
                        <Badge status={contact.opted_in ? 'active' : 'opted_out'} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatRelativeDate(contact.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setEditingContact(contact)}
                            className="rounded p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                            aria-label="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Supprimer ce contact ?')) {
                                await mutations.remove(contact.id)
                                refresh()
                              }
                            }}
                            className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Lignes par page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400">
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredContacts.length)} sur {filteredContacts.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm font-medium text-slate-700">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Add/Edit modal */}
      <ContactFormModal
        open={showAddModal || editingContact !== null}
        contact={editingContact}
        onClose={() => {
          setShowAddModal(false)
          setEditingContact(null)
        }}
        onSave={async (data) => {
          if (editingContact) {
            await mutations.update(editingContact.id, data)
          } else {
            await mutations.create(data as any)
          }
          setShowAddModal(false)
          setEditingContact(null)
          refresh()
        }}
      />

      {/* Import modal */}
      <ImportCSVModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (contacts) => {
          let count = 0
          for (const c of contacts) {
            const result = await mutations.create(c)
            if (!result.error) count++
          }
          addToast({
            type: 'success',
            title: 'Import réussi',
            description: `${count} contacts importés`,
          })
          setShowImportModal(false)
          refresh()
        }}
      />
    </div>
  )
}

function SortHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string
  field: 'name' | 'phone' | 'city' | 'created_at'
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (f: any) => void
}) {
  const active = sortBy === field
  return (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 font-semibold text-xs uppercase tracking-wider',
          active ? 'text-primary-700' : 'text-slate-600 hover:text-slate-900'
        )}
      >
        {label}
        <ChevronDown className={cn('h-3 w-3 transition-transform', active && sortDir === 'asc' && 'rotate-180')} />
      </button>
    </th>
  )
}

function ContactFormModal({
  open,
  contact,
  onClose,
  onSave,
}: {
  open: boolean
  contact: Contact | null
  onClose: () => void
  onSave: (data: Partial<Contact>) => void
}) {
  const [form, setForm] = useState({
    phone: contact?.phone || '',
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    city: contact?.city || '',
    opted_in: contact?.opted_in ?? true,
  })
  const [error, setError] = useState('')

  // Reset when opening
  useMemo(() => {
    setForm({
      phone: contact?.phone || '',
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      email: contact?.email || '',
      city: contact?.city || '',
      opted_in: contact?.opted_in ?? true,
    })
    setError('')
  }, [contact, open])

  const handleSubmit = () => {
    const result = validatePhoneInternational(form.phone)
    if (!result.valid) {
      setError(result.error || 'Numéro de téléphone invalide. Format international requis : +CCXXXXXXXXX (ex: +33612345678)')
      return
    }
    const formatted = result.formatted || form.phone
    onSave({ ...form, phone: formatted } as any)
  }

  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Modifier le contact' : 'Nouveau contact'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="Lucas"
          />
          <Input
            label="Nom"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder="Peeters"
          />
        </div>
        <Input
          label="Téléphone *"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+33 6 12 34 56 78"
          helperText="Format international : +CCXXXXXXXXX (ex: +32 BE, +33 FR, +212 MA)"
          error={error}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="lucas@email.be"
        />
        <Input
          label="Ville"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="Bruxelles"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.opted_in}
            onChange={(e) => setForm({ ...form, opted_in: e.target.checked })}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-slate-700">Consentement opt-in donné (RGPD)</span>
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit}>{contact ? 'Enregistrer' : 'Ajouter'}</Button>
      </div>
    </Modal>
  )
}

function ImportCSVModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (contacts: Omit<Contact, 'id' | 'created_at' | 'updated_at'>[]) => void
}) {
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState<Omit<Contact, 'id' | 'created_at' | 'updated_at'>[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const parseCSV = (text: string) => {
    setParsing(true)
    setErrors([])
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      setErrors(['Le fichier est vide ou ne contient pas de données.'])
      setParsing(false)
      return
    }
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
    const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('téléphone') || h.includes('tel'))
    const firstNameIdx = headers.findIndex((h) => h.includes('prenom') || h.includes('first') || h === 'prénom')
    const lastNameIdx = headers.findIndex((h) => h.includes('nom') || h.includes('last') || h === 'name')
    const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'))
    const cityIdx = headers.findIndex((h) => h.includes('ville') || h.includes('city'))

    if (phoneIdx === -1) {
      setErrors(['Colonne "phone" introuvable.'])
      setParsing(false)
      return
    }

    const parsed: Omit<Contact, 'id' | 'created_at' | 'updated_at'>[] = []
    const localErrors: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      const phone = cols[phoneIdx]?.trim().replace(/['"]/g, '')
      if (!phone) continue
      const result = validatePhoneInternational(phone)
      if (!result.valid) {
        localErrors.push(`Ligne ${i + 1}: ${result.error || 'numéro invalide'} "${phone}"`)
        continue
      }
      const formatted = result.formatted || phone
      parsed.push({
        user_id: 'user-1',
        phone: formatted,
        first_name: firstNameIdx >= 0 ? cols[firstNameIdx]?.trim().replace(/['"]/g, '') : undefined,
        last_name: lastNameIdx >= 0 ? cols[lastNameIdx]?.trim().replace(/['"]/g, '') : undefined,
        email: emailIdx >= 0 ? cols[emailIdx]?.trim().replace(/['"]/g, '') : undefined,
        city: cityIdx >= 0 ? cols[cityIdx]?.trim().replace(/['"]/g, '') : undefined,
        country: 'BE',
        opted_in: true,
        source: 'import',
        tags: [],
      })
    }
    setPreview(parsed)
    setErrors(localErrors)
    setParsing(false)
  }

  const handleImport = () => {
    if (preview.length > 0) onImport(preview)
  }

  const downloadTemplate = () => {
    const csv = 'phone,first_name,last_name,email,city\n+32470123456,Lucas,Peeters,lucas@email.be,Bruxelles\n+32471234567,Emma,Janssens,emma@email.be,Anvers'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-contacts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal open={open} onClose={onClose} title="Importer des contacts" size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center bg-slate-50">
          <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">Glissez-déposez votre fichier CSV</p>
          <p className="text-xs text-slate-500 mb-4">ou cliquez pour parcourir</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <span className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Choisir un fichier
            </span>
          </label>
          <button onClick={downloadTemplate} className="block mx-auto mt-3 text-xs text-primary-600 hover:underline">
            📥 Télécharger le modèle CSV
          </button>
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-900 mb-1">⚠️ Erreurs ({errors.length})</p>
            <ul className="text-xs text-red-800 space-y-0.5 max-h-24 overflow-y-auto">
              {errors.slice(0, 5).map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        {preview.length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-900 mb-2">
              ✓ {preview.length} contacts prêts à importer
            </p>
            <div className="max-h-32 overflow-y-auto rounded border border-emerald-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">Nom</th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">Téléphone</th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">Ville</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1">{c.first_name} {c.last_name}</td>
                      <td className="px-2 py-1 font-mono">{c.phone}</td>
                      <td className="px-2 py-1">{c.city}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 5 && (
              <p className="text-xs text-emerald-700 mt-1">... et {preview.length - 5} autres</p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleImport} disabled={preview.length === 0} loading={parsing}>
          Importer {preview.length > 0 && `(${preview.length})`}
        </Button>
      </div>
    </Modal>
  )
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
