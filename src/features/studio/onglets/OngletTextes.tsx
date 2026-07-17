import { useState } from 'react'
import { appelerFonction } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { Bouton } from '../../../components/ui/Bouton'
import { Carte } from '../../../components/ui/Carte'
import { MessageErreur } from '../../../components/ui/MessageErreur'
import { partagerSurWhatsApp, copierTexte } from '../partage'
import type { Produit } from '../../../types/database'

// ✍️ Onglet Textes — Agent Copywriter (1 crédit, 3 variantes)

const typesTexte = [
  { valeur: 'description_vente', label: '🛍️ Description de vente' },
  { valeur: 'legende', label: '💬 Légende Insta/Facebook' },
  { valeur: 'statut_whatsapp', label: '🟢 Statut WhatsApp' },
  { valeur: 'accroches_pub', label: '⚡ Accroches de pub' },
  { valeur: 'reponses_objections', label: '🙋 Réponses aux objections' },
]

export function OngletTextes({ produit }: { produit: Produit }) {
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [type, setType] = useState('description_vente')
  const [variantes, setVariantes] = useState<string[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)
  const [copie, setCopie] = useState<number | null>(null)

  async function generer() {
    setErreurMsg(null)
    setChargement(true)
    try {
      const res = await appelerFonction<{ variantes: string[] }>('agent-copywriter', {
        produit_id: produit.id,
        type_texte: type,
      })
      setVariantes(res.variantes)
      await rechargerProfil() // met à jour le solde affiché
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'La génération a échoué.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {typesTexte.map((t) => (
          <button
            key={t.valeur}
            onClick={() => setType(t.valeur)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium ${
              type === t.valeur ? 'bg-or text-white' : 'bg-carte border border-encre/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <MessageErreur message={erreurMsg} />
      <Bouton pleineLargeur chargement={chargement} onClick={generer}>
        ✨ Générer 3 textes (1 crédit)
      </Bouton>

      {variantes.map((v, i) => (
        <Carte key={i}>
          <p className="whitespace-pre-wrap text-sm">{v}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                await copierTexte(v)
                setCopie(i)
                setTimeout(() => setCopie(null), 1500)
              }}
              className="rounded-full bg-fond px-3 py-1.5 text-xs font-semibold"
            >
              {copie === i ? '✅ Copié !' : '📋 Copier'}
            </button>
            <button
              onClick={() => partagerSurWhatsApp(v)}
              className="rounded-full bg-succes/10 px-3 py-1.5 text-xs font-semibold text-succes"
            >
              🟢 Partager sur WhatsApp
            </button>
          </div>
        </Carte>
      ))}
    </div>
  )
}
