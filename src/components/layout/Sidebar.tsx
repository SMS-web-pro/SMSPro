import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Send,
  BarChart3,
  Settings,
  X,
  Smartphone,
  Sparkles,
  Inbox,
  Zap,
  Ticket,
  Mail,
  BookOpen,
  Rocket,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/campaigns', icon: MessageSquare, label: 'Campagnes' },
  { to: '/inbox', icon: Inbox, label: 'Boîte de réception' },
  { to: '/auto-reply', icon: Zap, label: 'Auto-répondeurs' },
  { to: '/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/invitations', icon: Mail, label: 'Invitations' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, inboxMessages, isDemo } = useStore()
  const location = useLocation()
  const unreadCount = inboxMessages.filter((m) => !m.is_read && m.direction === 'inbound').length

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Bannière mode démo */}
        {isDemo && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">Mode Démo</p>
              <p className="text-[10px] leading-tight opacity-90">Données fictives</p>
            </div>
          </div>
        )}

        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">SMSPro</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Campaign Manager</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded p-1 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* New Campaign CTA */}
        <div className="p-4">
          <NavLink
            to="/campaigns/new"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-primary-700 hover:to-primary-800 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Nouvelle campagne
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="px-3 mb-2 mt-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </p>
          </div>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? 'text-primary-600' : 'text-slate-400')} />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/inbox' && unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>

          <div className="px-3 mb-2 mt-6">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Liens rapides
            </p>
          </div>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/contacts?action=import"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Users className="h-4 w-4 text-slate-400" />
                Importer contacts
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/analytics"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Send className="h-4 w-4 text-slate-400" />
                Rapports
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/setup"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Rocket className="h-4 w-4 text-slate-400" />
                Configuration
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/user-guide"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <BookOpen className="h-4 w-4 text-slate-400" />
                Mode d'emploi
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200">
          <div className="rounded-lg bg-gradient-to-br from-primary-50 to-blue-50 p-3 border border-primary-100">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary-600" />
              <p className="text-xs font-semibold text-primary-900">RGPD Conforme</p>
            </div>
            <p className="text-[11px] text-primary-700">
              Vos données sont chiffrées et stockées en UE
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
