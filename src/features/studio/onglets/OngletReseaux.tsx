import { useEffect, useState } from 'react'
import { supabase, appelerFonction } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { Bouton } from '../../../components/ui/Bouton'
import { Carte } from '../../../components/ui/Carte'
import { MessageErreur } from '../../../components/ui/MessageErreur'
import { copierTexte } from '../partage'
import type { Produit, Generation } from '../../../types/database'

// 📱 Onglet Réseaux — Agent Réseaux sociaux : déclinaisons par plateforme (3 crédits)

interface Declinaisons {
  tiktok: { legende: string; hashtags: string[] }
  instagram: { legende_post: string; texte_story: string }
  facebook: { texte_post: string }
  youtube_shorts: { titre: string; description: string }
  whatsapp: { statut: string; message_diffusion: string }
}

export function OngletReseaux({ produit }: { produit: Produit }) {
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [sources, setSources] = useState<Generation[]>([])
  const [choisi, setChoisi] = useState<string | null>(null)
  const [declinaisons, setDeclinaisons] = useState<Declinaisons | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)
  const [copie, setCopie] = useState<string | null>(null)

  // Liste des visuels/vidéos terminés du produit, à décliner
  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('produit_id', produit.id)
        .in('type', ['visuel', 'video'])
        .eq('statut', 'termine')
        .order('created_at', { ascending: false })
      setSources((data as Generation[]) ?? [])
    }
    void charger()
  }, [produit.id])

  async function decliner() {
    setErreurMsg(null)
    if (!choisi) return setErreurMsg('Choisis d’abord un visuel ou une vidéo à décliner.')
    setChargement(true)
    try {
      const res = await appelerFonction<{ declinaisons: Declinaisons }>(
        'agent-reseaux-sociaux',
        { generation_id: choisi }
      )
      setDeclinaisons(res.declinaisons)
      await rechargerProfil()
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'La déclinaison a échoué.')
    } finally {
      setChargement(false)
    }
  }

  function BlocTexte({ id, titre, texte }: { id: string; titre: string; texte: string }) {
    return (
      <Carte>
        <p className="font-semibold">{titre}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-encre-douce">{texte}</p>
        <button
          onClick={async () => {
            await copierTexte(texte)
            setCopie(id)
            setTimeout(() => setCopie(null), 1500)
          }}
          className="mt-2 rounded-full bg-fond px-3 py-1.5 text-xs font-semibold"
        >
          {copie === id ? '✅ Copié !' : '📋 Copier'}
        </button>
      </Carte>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {sources.length === 0 ? (
        <Carte className="text-center text-sm text-encre-douce">
          Crée d'abord un visuel ou une vidéo, puis reviens ici pour l'adapter à chaque réseau. 😉
        </Carte>
      ) : (
        <>
          <p className="text-sm font-semibold">Choisis le contenu à décliner :</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setChoisi(s.id)}
                className={`relative shrink-0 overflow-hidden rounded-xl border-2 ${
                  choisi === s.id ? 'border-terracotta' : 'border-transparent'
                }`}
              >
                {s.type === 'video' ? (
                  <video src={s.resultat_url ?? undefined} className="h-24 w-24 object-cover" />
                ) : (
                  <img src={s.resultat_url ?? undefined} alt="" className="h-24 w-24 object-cover" />
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {s.type === 'video' ? '🎬' : '🖼️'}
                </span>
              </button>
            ))}
          </div>

          <MessageErreur message={erreurMsg} />
          <Bouton pleineLargeur chargement={chargement} onClick={decliner}>
            📱 Décliner pour tous les réseaux (3 crédits)
          </Bouton>
        </>
      )}

      {declinaisons && (
        <div className="flex flex-col gap-3">
          <BlocTexte
            id="tiktok"
            titre="🎵 TikTok (format 9:16)"
            texte={`${declinaisons.tiktok.legende}\n${declinaisons.tiktok.hashtags.join(' ')}`}
          />
          <BlocTexte id="ig-post" titre="📸 Instagram — post (1:1)" texte={declinaisons.instagram.legende_post} />
          <BlocTexte id="ig-story" titre="📸 Instagram — story (9:16)" texte={declinaisons.instagram.texte_story} />
          <BlocTexte id="fb" titre="👍 Facebook (4:5)" texte={declinaisons.facebook.texte_post} />
          <BlocTexte
            id="yt"
            titre="▶️ YouTube Shorts"
            texte={`${declinaisons.youtube_shorts.titre}\n\n${declinaisons.youtube_shorts.description}`}
          />
          <BlocTexte id="wa-statut" titre="🟢 WhatsApp — statut" texte={declinaisons.whatsapp.statut} />
          <BlocTexte id="wa-diff" titre="🟢 WhatsApp — message de diffusion" texte={declinaisons.whatsapp.message_diffusion} />
        </div>
      )}
    </div>
  )
}
