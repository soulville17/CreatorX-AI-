import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Carte } from '../../components/ui/Carte'
import { Chargement } from '../../components/ui/Chargement'

// Retour après paiement CinetPay. Le crédit réel est fait par le webhook :
// ici on interroge simplement le statut du paiement (avec quelques réessais,
// le temps que la notification serveur arrive).

export function RetourPaiementPage() {
  const [params] = useSearchParams()
  const reference = params.get('ref')
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [statut, setStatut] = useState<'attente' | 'confirme' | 'echoue' | 'inconnu'>('attente')

  useEffect(() => {
    let annule = false
    async function verifier(essai = 0) {
      if (!reference) return setStatut('inconnu')
      const { data } = await supabase
        .from('paiements')
        .select('statut')
        .eq('reference_cinetpay', reference)
        .maybeSingle()
      if (annule) return
      if (data?.statut === 'confirme') {
        setStatut('confirme')
        await rechargerProfil()
        return
      }
      if (data?.statut === 'echoue') return setStatut('echoue')
      // Le webhook peut mettre quelques secondes : on réessaie 10 fois
      if (essai < 10) setTimeout(() => void verifier(essai + 1), 3000)
      else setStatut('inconnu')
    }
    void verifier()
    return () => {
      annule = true
    }
  }, [reference, rechargerProfil])

  if (statut === 'attente') {
    return <Chargement message="Vérification de ton paiement… quelques secondes ⏳" />
  }

  return (
    <div className="flex flex-col gap-4 py-8">
      <Carte className="text-center">
        {statut === 'confirme' ? (
          <>
            <p className="text-4xl">🎉</p>
            <p className="mt-2 text-lg font-bold">Paiement confirmé !</p>
            <p className="mt-1 text-sm text-encre-douce">
              Merci ! Tes crédits sont disponibles ou ta campagne part en préparation.
            </p>
          </>
        ) : statut === 'echoue' ? (
          <>
            <p className="text-4xl">😕</p>
            <p className="mt-2 text-lg font-bold">Le paiement n'a pas abouti</p>
            <p className="mt-1 text-sm text-encre-douce">
              Aucun montant n'a été débité. Tu peux réessayer quand tu veux.
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl">🕐</p>
            <p className="mt-2 text-lg font-bold">Paiement en cours de confirmation</p>
            <p className="mt-1 text-sm text-encre-douce">
              Si tu as bien validé le paiement sur ton téléphone, ton solde sera mis à jour
              d'ici quelques minutes.
            </p>
          </>
        )}
      </Carte>
      <Link
        to="/accueil"
        className="btn flex items-center justify-center rounded-2xl bg-terracotta px-6 py-3.5 font-bold text-white"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
