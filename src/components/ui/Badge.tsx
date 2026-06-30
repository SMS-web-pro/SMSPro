import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'
import { statusColors, statusLabels } from '@/lib/utils'

export interface BadgeProps {
  children?: ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  status?: string // accepte n'importe quel status
}

const variantClasses: Record<string, string> = {
  default: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
}

export function Badge({ children, className, variant = 'default', size = 'md', status }: BadgeProps) {
  if (status) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-medium',
          statusColors[status] || statusColors.default || 'bg-slate-100 text-slate-700 border-slate-200',
          sizeClasses[size],
          className
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full',
          status === 'sent' || status === 'delivered' || status === 'active' ? 'bg-emerald-500' :
          status === 'sending' || status === 'queued' ? 'bg-blue-500 animate-pulse' :
          status === 'scheduled' ? 'bg-blue-500' :
          status === 'draft' ? 'bg-slate-400' :
          status === 'failed' || status === 'undelivered' || status === 'opted_out' ? 'bg-slate-400' :
          'bg-slate-400'
        )} />
        {children || statusLabels[status] || status}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  )
}
