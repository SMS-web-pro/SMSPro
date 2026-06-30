import { useState } from 'react'
import {
  Rocket,
  Database,
  Mail,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

/**
 * Assistant de configuration initial pour SMSPro
 *
 * Page accessible à /setup — guide l'admin à :
 * 1. Vérifier la connexion Supabase
 * 2. Exécuter le schéma SQL
 * 3. Créer son premier compte utilisateur
 * 4. Tester la connexion Twilio (optionnel)
 */

export function SetupWizardPage() {
  const [step, setStep] = useState(1)
  const supabaseOk = isSupabaseConfigured()

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg mb-4">
          <Rocket className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Assistant de configuration</h1>
        <p className="text-sm text-slate-500 mt-2">
          Configurez SMSPro en 5 étapes simples
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full font-bold transition-all',
                step >= s
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              )}
            >
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={cn(
                  'h-1 w-12 mx-1 rounded transition-colors',
                  step > s ? 'bg-primary-600' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <Step1 supabaseOk={supabaseOk} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <Step2 onPrev={() => setStep(1)} onNext={() => setStep(3)} />
      )}
      {step === 3 && (
        <Step3 onPrev={() => setStep(2)} onNext={() => setStep(4)} />
      )}
      {step === 4 && (
        <Step4 onPrev={() => setStep(3)} onComplete={() => {
          window.location.href = '/login'
        }} />
      )}
    </div>
  )
}

function cn(...classes: any[]) { return classes.filter(Boolean).join(' ') }

// ===================== STEP 1: Vérifier la config Supabase =====================
function Step1({ supabaseOk, onNext }: { supabaseOk: boolean; onNext: () => void }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Database className="h-6 w-6 text-primary-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Étape 1 — Connexion Supabase</h2>
            <p className="text-sm text-slate-600 mt-1">
              Vérifions que votre projet Supabase est bien connecté.
            </p>
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          'rounded-lg p-4 flex items-start gap-3 mb-4',
          supabaseOk
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-red-50 border border-red-200'
        )}>
          {supabaseOk ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {supabaseOk ? (
              <>
                <p className="text-sm font-semibold text-emerald-900">✅ Supabase connecté</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Les credentials sont bien chargés dans .env.local
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-red-900">⚠️ Supabase NON configuré</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Vérifiez votre fichier .env.local (voir instructions ci-dessous)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-slate-900">📝 Comment configurer :</p>
          <ol className="space-y-2 list-decimal list-inside text-slate-700">
            <li>
              Créez un compte sur <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-1">supabase.com <ExternalLink className="h-3 w-3" /></a> et un nouveau projet
            </li>
            <li>
              Allez dans <strong>Project Settings → API</strong>
            </li>
            <li>
              Copiez <strong>Project URL</strong> et <strong>anon public key</strong>
            </li>
            <li>
              Créez un fichier <code className="px-1 bg-slate-100 rounded">.env.local</code> à la racine :
            </li>
          </ol>

          <div className="rounded-lg bg-slate-900 text-slate-100 p-4 mt-3">
            <p className="text-xs mb-2 text-slate-400">.env.local</p>
            <pre className="text-xs font-mono">
{`VITE_SUPABASE_URL=https://VOTRE-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
            </pre>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            💡 Sur Vercel : Settings → Environment Variables → ajouter ces 2 variables
          </p>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onNext} rightIcon={<ChevronRight className="h-4 w-4" />}>
            {supabaseOk ? 'Continuer' : 'J\'ai configuré, continuer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== STEP 2: Schéma SQL =====================
function Step2({ onPrev, onNext }: {
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Database className="h-6 w-6 text-primary-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Étape 2 — Initialiser la base de données</h2>
            <p className="text-sm text-slate-600 mt-1">
              Créez toutes les tables en exécutant le schéma SQL.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
          <p className="text-xs font-semibold text-amber-900 mb-1">📋 Procédure :</p>
          <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
            <li>Allez sur <strong>app.supabase.com</strong> → votre projet</li>
            <li>Menu gauche → <strong>SQL Editor → New query</strong></li>
            <li>Revenez dans cette app → <strong>Paramètres → Base de données</strong></li>
            <li>Onglet "Schéma complet" → <strong>Copier</strong></li>
            <li>Collez dans Supabase SQL Editor → <strong>Run</strong></li>
            <li>Attendez "Success. No rows returned"</li>
          </ol>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrev} leftIcon={<ChevronLeft className="h-4 w-4" />}>
            Précédent
          </Button>
          <Button onClick={onNext} rightIcon={<ChevronRight className="h-4 w-4" />}>
            Continuer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== STEP 3: Créer le premier compte =====================
function Step3({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Mail className="h-6 w-6 text-primary-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Étape 3 — Créer votre compte admin</h2>
            <p className="text-sm text-slate-600 mt-1">
              Vous devez créer au moins un compte pour pouvoir vous connecter.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
          <p className="text-xs font-semibold text-blue-900 mb-2">📝 Comment créer votre compte :</p>
          <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
            <li>
              Allez sur <strong>Authentication → Users</strong> dans Supabase
            </li>
            <li>
              Cliquez <strong>"Add user → Create new user"</strong>
            </li>
            <li>
              Remplissez :
              <ul className="ml-6 mt-1 space-y-0.5 list-disc">
                <li>Email : votre-email@votredomaine.com</li>
                <li>Password : min. 8 caractères</li>
                <li><strong>Auto Confirm User ✓</strong> (IMPORTANT)</li>
              </ul>
            </li>
            <li>
              Cliquez <strong>"Create user"</strong>
            </li>
            <li>
              Retournez sur cette app → <strong>Login</strong>
            </li>
          </ol>
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 mb-4">
          <p className="text-xs text-emerald-900">
            <strong>💡 Note :</strong> Vous êtes le seul à pouvoir créer des comptes.
            Pour ajouter d'autres personnes à votre équipe, répétez la procédure ci-dessus pour chaque email.
          </p>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrev} leftIcon={<ChevronLeft className="h-4 w-4" />}>
            Précédent
          </Button>
          <Button onClick={onNext} rightIcon={<ChevronRight className="h-4 w-4" />}>
            J'ai créé mon compte
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== STEP 4: Test + Congratulations =====================
function Step4({ onPrev, onComplete }: { onPrev: () => void; onComplete: () => void }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Félicitations ! 🎉</h2>
          <p className="text-sm text-slate-600 mt-2">
            Votre plateforme SMSPro est prête à être utilisée
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4 text-left">
          <p className="text-sm font-semibold text-blue-900 mb-2">🚀 Pour aller plus loin :</p>
          <ul className="text-xs text-blue-800 space-y-1.5">
            <li>• <strong>Paramètres → SMS & Twilio</strong> : configurer l'envoi des SMS</li>
            <li>• <strong>Paramètres → Compte</strong> : pays par défaut, langue</li>
            <li>• <strong>Voir la démo</strong> : tester sans compte pour explorer</li>
            <li>• <strong>Mode d'emploi</strong> : guide complet intégré (sidebar → Liens rapides)</li>
          </ul>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onPrev} leftIcon={<ChevronLeft className="h-4 w-4" />}>
            Précédent
          </Button>
          <Button onClick={onComplete} rightIcon={<ChevronRight className="h-4 w-4" />}>
            Aller à la page de connexion
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
