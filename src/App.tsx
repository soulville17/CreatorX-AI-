import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { LandingPage } from './features/landing/LandingPage'
import { AuthPage } from './features/auth/AuthPage'
import { OnboardingPage } from './features/auth/OnboardingPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AjoutProduitPage } from './features/produits/AjoutProduitPage'
import { StudioPage } from './features/studio/StudioPage'
import { NouvelleCampagnePage } from './features/campagnes/NouvelleCampagnePage'
import { SuiviCampagnePage } from './features/campagnes/SuiviCampagnePage'
import { AcheterCreditsPage } from './features/credits/AcheterCreditsPage'
import { RetourPaiementPage } from './features/credits/RetourPaiementPage'
import { ProfilPage } from './features/profil/ProfilPage'
import { AdminPage } from './features/admin/AdminPage'

// Routage principal de l'application.
export default function App() {
  const initialiser = useAuthStore((s) => s.initialiser)

  useEffect(() => {
    void initialiser()
  }, [initialiser])

  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/connexion" element={<AuthPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Espace connecté (en-tête + navigation basse) */}
      <Route element={<AppLayout />}>
        <Route path="/accueil" element={<DashboardPage />} />
        <Route path="/produits/nouveau" element={<AjoutProduitPage />} />
        <Route path="/produits/:id/studio" element={<StudioPage />} />
        <Route path="/campagnes/nouvelle" element={<NouvelleCampagnePage />} />
        <Route path="/campagnes/:id" element={<SuiviCampagnePage />} />
        <Route path="/credits" element={<AcheterCreditsPage />} />
        <Route path="/paiement/retour" element={<RetourPaiementPage />} />
        <Route path="/profil" element={<ProfilPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}
