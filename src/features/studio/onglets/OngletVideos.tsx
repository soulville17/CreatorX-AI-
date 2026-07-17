import { useEffect, useRef, useState } from 'react'
import { appelerFonction } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { Bouton } from '../../../components/ui/Bouton'
import { Carte } from '../../../components/ui/Carte'
import { MessageErreur } from '../../../components/ui/MessageErreur'
import type { Produit } from '../../../types/database'

// 🎬 Onglet Vidéos — Agent Vidéo (20 crédits, file d'attente, 2 régénérations offertes)

const styles = [
  { valeur: 'dynamique', label: '⚡ Dynamique' },
  { valeur: 'elegant', label: '💎 Élégant' },
  { valeur: 'festif', label: '🎉 Festif' },
]

interface EtatVideo {
  generationId: string
  statut: 'en_attente' | 'en_cours' | 'termine' | 'echec'
  url?: string
}

export function OngletVideos({ produit }: { produit: Produit }) {
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [accroche, setAccroche] = useState('')
  const [style, setStyle] = useState('dynamique')
  const [avecVoix, setAvecVoix] = useState(false)
  const [texteVoix, setTexteVoix] = useState('')
  const [genreVoix, setGenreVoix] = useState<'femme' | 'homme'>('femme')
  const [video, setVideo] = useState<EtatVideo | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)
  const minuterie = useRef<ReturnType<typeof setInterval> | null>(null)

  // Interroge la file d'attente toutes les 6 secondes tant que la vidéo se prépare
  useEffect(() => {
    if (!video || video.statut === 'termine' || video.statut === 'echec') return
    minuterie.current = setInterval(async () => {
      try {
        const res = await appelerFonction<{ statut: EtatVideo['statut']; url?: string }>(
          'agent-video',
          { action: 'statut', generation_id: video.generationId }
        )
        setVideo((v) => (v ? { ...v, statut: res.statut, url: res.url } : v))
        if (res.statut === 'echec') {
          setErreurMsg('La création de la vidéo a échoué. Tes crédits ont été rendus.')
          await rechargerProfil()
        }
      } catch {
        /* on retentera au prochain tick */
      }
    }, 6000)
    return () => {
      if (minuterie.current) clearInterval(minuterie.current)
    }
  }, [video, rechargerProfil])

  async function lancer(regenerationDe?: string) {
    setErreurMsg(null)
    if (!accroche.trim()) return setErreurMsg("Écris l'accroche qui s'affichera sur ta vidéo.")
    if (avecVoix && !texteVoix.trim()) {
      return setErreurMsg('Écris le texte que la voix va lire.')
    }
    setChargement(true)
    try {
      const res = await appelerFonction<{ generation_id: string; gratuit: boolean }>(
        'agent-video',
        {
          produit_id: produit.id,
          accroche: accroche.trim(),
          style,
          avec_voix: avecVoix,
          texte_voix: texteVoix.trim(),
          genre_voix: genreVoix,
          regeneration_de: regenerationDe ?? null,
        }
      )
      setVideo({ generationId: res.generation_id, statut: 'en_attente' })
      await rechargerProfil()
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'Le lancement a échoué.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        placeholder="L'accroche de ta vidéo (ex : La robe qui fait tourner les têtes ✨)"
        value={accroche}
        onChange={(e) => setAccroche(e.target.value)}
        className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
      />

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

      {/* Voix off optionnelle */}
      <Carte>
        <label className="flex items-center justify-between">
          <span className="font-semibold">🎙️ Ajouter une voix off</span>
          <input
            type="checkbox"
            checked={avecVoix}
            onChange={(e) => setAvecVoix(e.target.checked)}
            className="h-6 w-6 accent-terracotta"
          />
        </label>
        {avecVoix && (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              placeholder="Le texte que la voix va lire…"
              value={texteVoix}
              onChange={(e) => setTexteVoix(e.target.value)}
              rows={2}
              className="rounded-xl border border-encre/15 px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2">
              {(['femme', 'homme'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenreVoix(g)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium ${
                    genreVoix === g ? 'bg-or text-white' : 'bg-fond'
                  }`}
                >
                  {g === 'femme' ? '👩🏾 Voix femme' : '👨🏾 Voix homme'}
                </button>
              ))}
            </div>
          </div>
        )}
      </Carte>

      <MessageErreur message={erreurMsg} />

      {!video || video.statut === 'echec' ? (
        <Bouton pleineLargeur chargement={chargement} onClick={() => lancer()}>
          🎬 Créer ma vidéo (20 crédits)
        </Bouton>
      ) : video.statut === 'termine' && video.url ? (
        <Carte className="overflow-hidden p-0">
          <video src={video.url} controls playsInline className="w-full" />
          <div className="flex flex-wrap gap-2 p-3">
            <a href={video.url} download target="_blank" rel="noreferrer" className="rounded-full bg-fond px-3 py-1.5 text-xs font-semibold">
              ⬇️ Télécharger
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${produit.nom} — ${produit.prix_fcfa} FCFA\n${video.url}`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-succes/10 px-3 py-1.5 text-xs font-semibold text-succes"
            >
              🟢 Partager sur WhatsApp
            </a>
            <button
              onClick={() => lancer(video.generationId)}
              className="rounded-full bg-or/10 px-3 py-1.5 text-xs font-semibold text-or-fonce"
            >
              🔄 Régénérer (2 essais offerts)
            </button>
          </div>
        </Carte>
      ) : (
        <Carte className="flex items-center gap-3">
          <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-or/30 border-t-or" />
          <div>
            <p className="font-semibold">Ta vidéo est en préparation ⏳</p>
            <p className="text-sm text-encre-douce">Environ 2 minutes. Tu peux rester sur cette page.</p>
          </div>
        </Carte>
      )}
    </div>
  )
}
