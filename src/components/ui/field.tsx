import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Champs de formulaire du système sombre.
 *
 * Le fond d'un champ est plus SOMBRE que son conteneur, pas plus clair :
 * sur une interface sombre, un creux se lit comme une zone de saisie, alors
 * qu'une surface plus claire se lit comme un élément en relief, donc inerte.
 */
const CONTROL =
  'w-full rounded-control border border-surface-600 bg-surface-950 px-3.5 py-2.5 text-body ' +
  'text-onDark-hi placeholder:text-onDark-lo transition-colors ' +
  'focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 ' +
  'disabled:bg-surface-900 disabled:text-onDark-lo disabled:cursor-not-allowed'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />
  },
)

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'resize-y', className)} {...props} />
})

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(CONTROL, 'cursor-pointer pr-9', className)} {...props}>
      {children}
    </select>
  )
})

export function Label({
  className,
  children,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('mb-1.5 block text-body font-medium text-onDark-hi', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
}

export function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-meta leading-relaxed text-onDark-lo">{children}</p>
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="mt-1.5 text-meta font-medium text-red-300">{children}</p>
}

export function Field({
  label,
  help,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string
  help?: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {help && !error && <FieldHelp>{help}</FieldHelp>}
      <FieldError>{error}</FieldError>
    </div>
  )
}

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 text-body text-onDark-md',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-surface-600 bg-surface-950 text-brand-500 focus:ring-brand-400 focus:ring-offset-0"
        {...props}
      />
      <span className="leading-relaxed">{label}</span>
    </label>
  )
}
