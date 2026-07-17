import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Gros bouton tactile — pensé pour le mobile (min 52px de haut).
interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primaire' | 'secondaire' | 'discret' | 'danger'
  pleineLargeur?: boolean
  chargement?: boolean
  children: ReactNode
}

const styles: Record<string, string> = {
  primaire:
    'bg-terracotta text-white active:bg-terracotta-fonce shadow-md shadow-terracotta/20',
  secondaire:
    'bg-or text-white active:bg-or-fonce shadow-md shadow-or/20',
  discret:
    'bg-white text-encre border border-encre/15 active:bg-fond',
  danger: 'bg-erreur text-white active:opacity-90',
}

export function Bouton({
  variante = 'primaire',
  pleineLargeur = false,
  chargement = false,
  children,
  disabled,
  className = '',
  ...props
}: BoutonProps) {
  return (
    <button
      disabled={disabled || chargement}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variante]} ${pleineLargeur ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {chargement && (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  )
}
