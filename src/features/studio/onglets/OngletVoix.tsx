import { useState } from 'react'
import { appelerFonction } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { Bouton } from '../../../components/ui/Bouton'
import { Carte } from '../../../components/ui/Carte'
import { MessageErreur } from '../../../components/ui/MessageErreur'
import type { Produit } from '../../../types/database'

// 🎙️ Onglet Voix — Agent Voix IA via ElevenLabs (2 crédits)

const tons = [
  { valeur: 'energique', label: '⚡ Énergique' },
  { valeur: 'chaleureux', label: '🤗 Chaleureux' },
  { valeur: 'professionnel', label: '💼 Professionnel' },
]

export function OngletVoix({ produit }: { produit: Produit }) {
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [texte, setTexte] = useState('')
  const [genre, setGenre] = useState<'femme' | 'homme'>('femme')
  const [ton, setTon] = useState('chaleureux')
  const [audios, setAudios] = useState<string[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  async function generer() {
    setErreurMsg(null)
    if (texte.trim().length < 5) return setErreurMsg('Écris le texte que la voix va lire.')
    setChargement(true)
    try {
      const res = await appelerFonction<{ url: string }>('agent-voix', {
        produit_id: produit.id,
        texte: texte.trim(),
        genre,
        ton,
      })
      setAudios((a) => [res.url, ...a])
      await rechargerProfil()
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'La création de la voix a échoué.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        placeholder={`Le texte à lire (ex : "${produit.nom} disponible à ${produit.prix_fcfa} FCFA, écris-moi vite sur WhatsApp !")`}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={3}
        maxLength={600}
        className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
      />
      <div className="flex gap-2">
        {(['femme', 'homme'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium ${
              genre === g ? 'bg-or text-white' : 'bg-carte border border-encre/10'
            }`}
          >
            {g === 'femme' ? '👩🏾 Femme' : '👨🏾 Homme'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {tons.map((t) => (
          <button
            key={t.valeur}
            onClick={() => setTon(t.valeur)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium ${
              ton === t.valeur ? 'bg-or text-white' : 'bg-carte border border-encre/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <MessageErreur message={erreurMsg} />
      <Bouton pleineLargeur chargement={chargement} onClick={generer}>
        🎙️ Créer ma voix off (2 crédits)
      </Bouton>

      {audios.map((url) => (
        <Carte key={url}>
          <audio src={url} controls className="w-full" />
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block rounded-full bg-fond px-3 py-1.5 text-xs font-semibold"
          >
            ⬇️ Télécharger le MP3
          </a>
        </Carte>
      ))}
    </div>
  )
}
