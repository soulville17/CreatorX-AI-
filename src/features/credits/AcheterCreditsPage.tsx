import { useEffect, useState } from 'react'
import { supabase, appelerFonction } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Bouton } from '../../components/ui/Bouton'
import { Carte } from '../../components/ui/Carte'
import { MessageErreur } from '../../components/ui/MessageErreur'
import { formaterFCFA, COUT_CREDITS } from '../../lib/credits'
import type { PackCredits } from '../../types/database'

// 💳 Achat de crédits : les 3 packs, paiement CinetPay (Wave / Orange Money).

export function AcheterCreditsPage() {
  const profile = useAuthStore((s) => s.profile)
  const [packs, setPacks] = useState<PackCredits[]>([])
  const [choisi, setChoisi] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from('packs_credits').select('*').order('prix_fcfa')
      setPacks((data as PackCredits[]) ?? [])
    }
    void charger()
  }, [])

  async function payer() {
    setErreurMsg(null)
    if (!choisi) return setErreurMsg('Choisis ton pack de crédits.')
    setChargement(true)
    try {
      const res = await appelerFonction<{ url_paiement: string }>('create-payment', {
        type: 'credits',
        pack_id: choisi,
      })
      window.location.href = res.url_paiement
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'Le paiement a échoué. Réessaie.')
      setChargement(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Recharger mes crédits ⚡</h1>
      <p className="text-encre-douce">
        Ton solde : <strong>{profile?.credits_solde ?? 0} crédits</strong>
      </p>

      <div className="grid gap-3">
        {packs.map((p) => (
          <button key={p.id} onClick={() => setChoisi(p.id)} className="text-left">
            <Carte className={choisi === p.id ? 'border-2 border-terracotta' : ''}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{p.nom}</p>
                  <p className="text-sm text-encre-douce">{p.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold text-terracotta">{formaterFCFA(p.prix_fcfa)}</p>
                  <p className="text-sm font-semibold text-or-fonce">⚡ {p.credits} crédits</p>
                </div>
              </div>
            </Carte>
          </button>
        ))}
      </div>

      <MessageErreur message={erreurMsg} />
      <Bouton pleineLargeur chargement={chargement} onClick={payer}>
        Payer avec Wave / Orange Money 📲
      </Bouton>

      <Carte>
        <p className="mb-2 font-semibold">Que peux-tu faire avec tes crédits ?</p>
        <ul className="flex flex-col gap-1 text-sm text-encre-douce">
          <li>✍️ 1 série de textes = {COUT_CREDITS.texte} crédit</li>
          <li>🖼️ 1 visuel pro = {COUT_CREDITS.visuel} crédits</li>
          <li>🎙️ 1 voix off = {COUT_CREDITS.voix} crédits</li>
          <li>🎬 1 vidéo 15 s = {COUT_CREDITS.video} crédits</li>
          <li>📱 1 déclinaison réseaux = {COUT_CREDITS.declinaison} crédits</li>
        </ul>
      </Carte>
    </div>
  )
}
