import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border bg-white text-sm text-slate-900 placeholder-slate-400',
              'transition-colors focus:outline-none focus:ring-2',
              'h-10 px-3',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
              'disabled:bg-slate-50 disabled:text-slate-500',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn('text-xs', error ? 'text-red-600' : 'text-slate-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `ta-${Math.random().toString(36).substring(2, 9)}`
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
            'transition-colors focus:outline-none focus:ring-2',
            'min-h-[80px] resize-y',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p className={cn('text-xs', error ? 'text-red-600' : 'text-slate-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const inputId = id || `sel-${Math.random().toString(36).substring(2, 9)}`
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-lg border bg-white px-3 h-10 text-sm text-slate-900',
            'transition-colors focus:outline-none focus:ring-2',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
