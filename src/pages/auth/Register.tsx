import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Smartphone,
  Mail,
  Lock,
  User,
  ArrowRight,
  Shield,
  Info,
  AlertCircle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signUp, isSupabaseConfigured } from '@/lib/supabaseClient'

const registerSchema = z.object({
  name: z.string().min(2, 'Au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [serverError, setServerError] = useState('')
  const navigate = useNavigate()
  const { isAuthenticated, addToast } = useStore()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setServerError('')
    try {
      const result = await signUp(data.email, data.password, data.name)
      if (!result.success) {
        setServerError(result.error || 'Erreur lors de la création du compte')
        addToast({ type: 'error', title: 'Échec de l\'inscription', description: result.error })
        setLoading(false)
        return
      }

      if (result.needsConfirmation) {
        // Email de confirmation requis
        setNeedsConfirmation(true)
        addToast({
          type: 'info',
          title: 'Vérifiez votre boîte mail',
          description: 'Un email de confirmation a été envoyé',
        })
      } else {
        addToast({ type: 'success', title: 'Compte créé !', description: 'Bienvenue sur SMSPro' })
        navigate('/login')
      }
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Si Supabase n'est pas configuré, on avertit avant de tenter l'inscription
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border-2 border-amber-300 bg-white p-8 shadow-xl text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
              <Smartphone className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Configuration requise</h2>
            <p className="text-sm text-slate-600 mb-2">
              La connexion à la base de données n'est pas encore configurée.
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Allez d'abord dans <strong>Paramètres → Connexion Supabase</strong> après avoir créé un projet sur supabase.com.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/setup">
                <Button fullWidth>🛠️ Ouvrir l'assistant de configuration</Button>
              </Link>
              <Link to="/login">
                <Button fullWidth variant="outline">Retour à la connexion</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <Mail className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Vérifiez votre email</h2>
            <p className="text-sm text-slate-600 mb-6">
              Un email de confirmation a été envoyé à votre adresse.
              Cliquez sur le lien pour activer votre compte.
            </p>
            <Link to="/login">
              <Button fullWidth>Retour à la connexion</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-200 mb-4">
            <Smartphone className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SMSPro</h1>
          <p className="text-sm text-slate-500">Créer un compte</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Inscription</h2>
            <p className="text-sm text-slate-500 mt-1">Créez votre compte pour commencer</p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-900">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
            <Input
              label="Nom complet"
              placeholder="Jean Dupont"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              autoComplete="name"
              required
              {...register('name')}
            />

            <Input
              label="Email professionnel"
              type="email"
              placeholder="vous@entreprise.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              autoComplete="email"
              required
              {...register('email')}
            />

            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              helperText="Minimum 8 caractères"
              autoComplete="new-password"
              required
              {...register('password')}
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              required
              {...register('confirmPassword')}
            />

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900">
                Un email de confirmation vous sera envoyé. Vérifiez votre boîte mail pour activer le compte.
              </p>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Se connecter
            </Link>
          </div>
        </div>

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
