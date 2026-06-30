import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Smartphone,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Info,
  Sparkles,
  Play,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Au moins 6 caractères'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [showDemoInfo, setShowDemoInfo] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login, loadDemoData, addToast, isAuthenticated } = useStore()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setErrorMsg(null) // Réinitialiser l'erreur
    setLoading(true)
    try {
      const result = await login(data.email, data.password)
      setLoading(false)
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Connexion réussie',
          description: 'Bienvenue sur SMSPro',
        })
        navigate('/dashboard')
      } else {
        // Afficher l'erreur EN GROS dans le formulaire
        setErrorMsg(result.error || 'Email ou mot de passe incorrect')
      }
    } catch (err) {
      setLoading(false)
      setErrorMsg('Erreur de connexion. Réessayez.')
    }
  }

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    // Petite latence pour montrer le loading state
    await new Promise((r) => setTimeout(r, 600))
    loadDemoData()
    setDemoLoading(false)
    addToast({
      type: 'info',
      title: '🎭 Mode démo activé',
      description: 'Explorez l\'application avec des données de démonstration',
    })
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-200 mb-4">
            <Smartphone className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SMSPro</h1>
          <p className="text-sm text-slate-500">Plateforme de campagnes SMS</p>
        </div>

        {/* Card principale */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Connexion</h2>
            <p className="text-sm text-slate-500 mt-1">
              Accédez à votre tableau de bord
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
            {/* ERREUR DE CONNEXION AFFICHÉE EN HAUT */}
            {errorMsg && (
              <div className="rounded-lg bg-red-50 border-2 border-red-300 p-3 flex items-start gap-2 animate-fade-in">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900">Échec de la connexion</p>
                  <p className="text-sm text-red-800 mt-0.5">{errorMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-red-500 hover:text-red-700 text-lg leading-none"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="vous@entreprise.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              autoComplete="email"
              required
              {...register('email')}
            />

            <div className="space-y-1.5">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pointer-events-auto hover:text-slate-600"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                autoComplete="current-password"
                required
                {...register('password')}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  defaultChecked
                />
                <span className="text-xs text-slate-600">Rester connecté</span>
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              Se connecter
            </Button>
          </form>

          {/* Info box première connexion */}
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold mb-1">Première connexion ?</p>
              <p className="text-blue-800">
                Votre compte a été créé par votre administrateur.
                Utilisez les identifiants qui vous ont été communiqués pour accéder à la plateforme.
              </p>
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-300" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-slate-300" />
        </div>

        {/* Bouton Démo */}
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Découvrir l'application</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Explorez toutes les fonctionnalités avec des données de démonstration
              </p>
            </div>
          </div>

          <Button
            fullWidth
            onClick={handleDemoLogin}
            loading={demoLoading}
            variant="primary"
            size="lg"
            leftIcon={!demoLoading ? <Play className="h-4 w-4" /> : undefined}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            {demoLoading ? 'Chargement...' : 'Voir la démo'}
          </Button>

          <button
            onClick={() => setShowDemoInfo(!showDemoInfo)}
            className="mt-3 w-full text-center text-[11px] text-amber-700 hover:text-amber-800 underline"
          >
            {showDemoInfo ? 'Masquer les détails' : 'Que contient la démo ?'}
          </button>

          {showDemoInfo && (
            <div className="mt-3 rounded-lg bg-white border border-amber-200 p-3 animate-fade-in">
              <p className="text-[11px] font-semibold text-amber-900 mb-2">Données pré-chargées :</p>
              <ul className="text-[11px] text-slate-700 space-y-1">
                <li>✓ 25 contacts avec consentement</li>
                <li>✓ 4 campagnes (envoyée, planifiée, envoi en cours, brouillon)</li>
                <li>✓ ~80 SMS avec tracking d'engagement (lus, cliqués)</li>
                <li>✓ 5 règles d'auto-répondeur (STOP, START, OUI, INFO, RDV)</li>
                <li>✓ 4 coupons promo avec historique d'utilisation</li>
                <li>✓ 2 invitations événementielles avec réponses</li>
                <li>✓ 8 messages inbox (réponses + mots-clés détectés)</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-amber-100 flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-amber-800 italic">
                  Mode lecture/écriture - toutes les modifications sont possibles mais locales.
                  Déconnectez-vous pour revenir à la page de connexion.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Lien discret vers l'assistant de configuration */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/setup')}
            className="text-xs text-slate-400 hover:text-primary-600 hover:underline"
          >
            🛠️ Assistant de configuration (première utilisation)
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Connexion sécurisée
          </span>
          <span>•</span>
          <span>Conforme RGPD</span>
        </div>
      </div>
    </div>
  )
}
