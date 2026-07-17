import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Carte } from '../../components/ui/Carte'
import { Bouton } from '../../components/ui/Bouton'

// 👤 Profil : informations du compte + déconnexion.

const libellesActivite: Record<string, string> = {
  mode: '👗 Mode & vêtements',
  cosmetiques: '💄 Cosmétiques',
  alimentation: '🍚 Alimentation',
  restaurant: '🍽️ Restaurant',
  beaute: '💇🏾‍♀️ Coiffure & beauté',
  sante: '🏥 Santé',
  auto: '🚗 Auto',
  immobilier: '🏠 Immobilier',
  formation: '🎓 Formation',
  services: '🛠️ Services',
  autre: '✨ Autre',
}

export function ProfilPage() {
  const navigate = useNavigate()
  const { profile, deconnexion } = useAuthStore()
  if (!profile) return null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Ton profil 👤</h1>
      <Carte>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-encre-douce">Prénom</span>
            <span className="font-semibold">{profile.nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-encre-douce">WhatsApp</span>
            <span className="font-semibold">{profile.numero_whatsapp}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-encre-douce">Ville</span>
            <span className="font-semibold">{profile.ville}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-encre-douce">Activité</span>
            <span className="font-semibold">{libellesActivite[profile.type_activite]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-encre-douce">Crédits</span>
            <span className="font-semibold">⚡ {profile.credits_solde}</span>
          </div>
        </div>
      </Carte>

      {profile.is_admin && (
        <Link to="/admin">
          <Carte className="font-semibold text-terracotta">🛠️ Espace administrateur →</Carte>
        </Link>
      )}

      <Bouton
        variante="discret"
        pleineLargeur
        onClick={async () => {
          await deconnexion()
          navigate('/')
        }}
      >
        Me déconnecter
      </Bouton>
    </div>
  )
}
