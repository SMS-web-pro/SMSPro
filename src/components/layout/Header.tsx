import { useState } from 'react'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Sparkles,
  RotateCcw,
  X,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useNavigate } from 'react-router-dom'
import { getInitials } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function Header() {
  const {
    toggleSidebar,
    user,
    logout,
    addToast,
    isDemo,
    exitDemoMode,
    resetDemoData,
  } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    if (isDemo) {
      exitDemoMode()
      addToast({ type: 'info', title: 'Mode démo quitté' })
    } else {
      logout()
      addToast({ type: 'success', title: 'Déconnexion réussie' })
    }
    navigate('/login')
  }

  const handleResetDemo = () => {
    resetDemoData()
    setShowResetConfirm(false)
    addToast({ type: 'success', title: 'Données démo réinitialisées' })
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
        <button
          onClick={toggleSidebar}
          className="lg:hidden rounded-lg p-2 hover:bg-slate-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>

        {/* Mode Démo Banner */}
        {isDemo && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Mode Démo</span>
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Rechercher contacts, campagnes..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Boutons mode démo */}
          {isDemo && (
            <>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                title="Réinitialiser les données de démo"
                aria-label="Réinitialiser"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                title="Quitter le mode démo"
                aria-label="Quitter la démo"
              >
                <X className="h-3.5 w-3.5" />
                Quitter
              </button>
            </>
          )}

          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg pl-1.5 pr-2 py-1.5 hover:bg-slate-100 transition-colors"
              aria-label="Menu profil"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xs font-semibold">
                {user ? getInitials(user.name) : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {user?.name || 'Utilisateur'}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-20 animate-fade-in">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      {isDemo && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase flex-shrink-0">
                          Démo
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4" />
                    Mon profil
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    Paramètres
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation pour réinitialiser */}
      <Modal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Réinitialiser les données de démo"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              Toutes les modifications que vous avez effectuées seront perdues.
              Les données de démonstration seront rechargées à l'identique.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleResetDemo}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  )
}
