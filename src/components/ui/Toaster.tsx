import { useStore } from '@/store/useStore'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/utils/cn'

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styleMap = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
}

export function Toaster() {
  const { toasts, removeToast } = useStore()

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-4 shadow-lg animate-toast-in',
              styleMap[toast.type]
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 rounded p-1 opacity-60 hover:opacity-100 hover:bg-black/5"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
