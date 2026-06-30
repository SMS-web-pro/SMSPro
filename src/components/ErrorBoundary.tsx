import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * ErrorBoundary global - capture toutes les erreurs React non gérées
 * et affiche un fallback gracieux au lieu d'un écran blanc.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // En production : envoyer à Sentry / LogRocket / console serveur
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    // Recharge la page pour reset l'état
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              L'application a rencontré un problème inattendu. Pas d'inquiétude, vos données sont sauvegardées.
            </p>
            {this.state.error && (
              <details className="text-left mb-6 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <summary className="text-xs font-medium text-slate-700 cursor-pointer">
                  Détails techniques
                </summary>
                <pre className="mt-2 text-[10px] text-slate-600 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button
              fullWidth
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={this.handleReset}
            >
              Réessayer
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
