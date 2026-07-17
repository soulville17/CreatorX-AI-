import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Chargement } from '../ui/Chargement'

// Gabarit des pages connectées : en-tête avec solde de crédits + navigation basse.
// Mobile-first : contenu limité à 480px, navigation type application.

const ongletsNav = [
  { chemin: '/accueil', label: 'Accueil', emoji: '🏠' },
  { chemin: '/campagnes/nouvelle', label: 'Campagne', emoji: '📢' },
  { chemin: '/credits', label: 'Crédits', emoji: '💳' },
  { chemin: '/profil', label: 'Profil', emoji: '👤' },
]

export function AppLayout() {
  const { session, profile, chargement } = useAuthStore()
  const location = useLocation()

  if (chargement) return <Chargement message="Ouverture de ton espace…" />
  // Non connecté → page de connexion
  if (!session) return <Navigate to="/connexion" replace />
  // Connecté mais profil incomplet → onboarding
  if (!profile) return <Navigate to="/onboarding" replace />

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      {/* En-tête : logo + solde de crédits toujours visible */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-fond/95 px-4 py-3 backdrop-blur">
        <Link to="/accueil" className="text-lg font-extrabold tracking-tight">
          Creator<span className="text-terracotta">X</span>
          <span className="text-or"> AI</span>
        </Link>
        <Link
          to="/credits"
          className="flex items-center gap-1.5 rounded-full bg-or/10 px-3 py-1.5 text-sm font-bold text-or-fonce"
        >
          ⚡ {profile.credits_solde} crédit{profile.credits_solde > 1 ? 's' : ''}
        </Link>
      </header>

      {/* Contenu de la page */}
      <main className="flex-1 px-4 pb-24 pt-2">
        <Outlet />
      </main>

      {/* Navigation basse, gros boutons tactiles */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-encre/10 bg-carte/95 backdrop-blur">
        <div className="flex">
          {ongletsNav.map((o) => {
            const actif = location.pathname.startsWith(o.chemin)
            return (
              <Link
                key={o.chemin}
                to={o.chemin}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  actif ? 'text-terracotta' : 'text-encre-douce'
                }`}
              >
                <span className="text-xl leading-none">{o.emoji}</span>
                {o.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
