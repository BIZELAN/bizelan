'use client'

import * as React from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'warning' | 'danger'

interface ToastInput {
  title: string
  description?: string
  tone?: Tone
  /** Durée d'affichage. `0` laisse la notification jusqu'à fermeture manuelle. */
  duration?: number
}

interface ToastItem extends ToastInput {
  id: number
}

const ICONS: Record<Tone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
}

const TONES: Record<Tone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

const ToastContext = React.createContext<((toast: ToastInput) => void) | null>(null)

/**
 * Notifications transitoires.
 *
 * Radix pose ici deux comportements qu'une implémentation maison rate
 * habituellement : le compte à rebours se **suspend** au survol et au focus,
 * et la pile est atteignable au clavier par la touche F6. Une notification qui
 * disparaît pendant qu'on la lit est une information perdue.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(0)

  const push = React.useCallback((toast: ToastInput) => {
    setItems((list) => [...list, { ...toast, id: nextId.current++ }])
  }, [])

  const dismiss = (id: number) => setItems((list) => list.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={push}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}

        {items.map((item) => {
          const tone = item.tone ?? 'info'
          const Icon = ICONS[tone]

          return (
            <RadixToast.Root
              key={item.id}
              duration={item.duration}
              onOpenChange={(open) => !open && dismiss(item.id)}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-line bg-surface-raised p-4 shadow-e2',
                'data-[state=open]:animate-fade-up',
                'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
                'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
              )}
            >
              <Icon className={cn('mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0', TONES[tone])} aria-hidden />

              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-base font-medium text-fg">
                  {item.title}
                </RadixToast.Title>
                {item.description && (
                  <RadixToast.Description className="mt-0.5 text-sm text-fg-muted">
                    {item.description}
                  </RadixToast.Description>
                )}
              </div>

              <RadixToast.Close className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Fermer</span>
              </RadixToast.Close>
            </RadixToast.Root>
          )
        })}

        <RadixToast.Viewport className="fixed bottom-0 right-0 z-[60] flex w-[min(24rem,100vw)] flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

/** Déclenche une notification. Exige un `ToastProvider` en amont. */
export function useToast() {
  const push = React.useContext(ToastContext)
  if (!push) {
    throw new Error('useToast doit être appelé sous un <ToastProvider>.')
  }
  return push
}
