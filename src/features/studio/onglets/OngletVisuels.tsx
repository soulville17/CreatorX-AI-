import { useState } from 'react'
import { appelerFonction } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { Bouton } from '../../../components/ui/Bouton'
import { Carte } from '../../../components/ui/Carte'
import { MessageErreur } from '../../../components/ui/MessageErreur'
import type { Produit } from '../../../types/database'

// 🖼️ Onglet Visuels — Agent Visuel via fal.ai FLUX (3 crédits)

const styles = [
  { valeur: 'moderne', label: '✨ Moderne' },
  { valeur: 'luxe', label: '💎 Luxe' },
  { valeur: 'chaleureux', label: '🌅 Chaleureux' },
  { valeur: 'minimaliste', label: '⬜ Épuré' },
]

export function OngletVisuels({ produit }: { produit: Produit }) {
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [style, setStyle] = useState('moderne')
  const [visuels, setVisuels] = useState<string[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  async function generer() {
    setErreurMsg(null)
    setChargement(true)
    try {
      const res = await appelerFonction<{ url: string }>('agent-visuel', {
        produit_id: produit.id,
        style,
        qualite: 'final',
      })
      setVisuels((v) => [res.url, ...v])
      await rechargerProfil()
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'La création du visuel a échoué.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <button
            key={s.valeur}
            onClick={() => setStyle(s.valeur)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium ${
              style === s.valeur ? 'bg-or text-white' : 'bg-carte border border-encre/10'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <MessageErreur message={erreurMsg} />
      <Bouton pleineLargeur chargement={chargement} onClick={generer}>
        🖼️ Créer un visuel (3 crédits)
      </Bouton>
      {chargement && (
        <p className="text-center text-sm text-encre-douce">Ton visuel arrive, ~20 secondes… 🎨</p>
      )}

      {visuels.map((url) => (
        <Carte key={url} className="overflow-hidden p-0">
          <img src={url} alt="Visuel publicitaire" className="w-full" />
          <div className="flex gap-2 p-3">
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-fond px-3 py-1.5 text-xs font-semibold"
            >
              ⬇️ Télécharger
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${produit.nom} — ${produit.prix_fcfa} FCFA\n${url}`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-succes/10 px-3 py-1.5 text-xs font-semibold text-succes"
            >
              🟢 Partager sur WhatsApp
            </a>
          </div>
        </Carte>
      ))}
    </div>
  )
}
