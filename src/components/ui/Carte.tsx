import type { HTMLAttributes, ReactNode } from 'react'

// Carte blanche arrondie — bloc de base de toute l'interface.
interface CarteProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Carte({ children, className = '', ...props }: CarteProps) {
  return (
    <div
      className={`rounded-2xl bg-carte p-4 shadow-sm border border-encre/5 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
