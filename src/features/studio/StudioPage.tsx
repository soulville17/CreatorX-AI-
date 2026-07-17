import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Chargement } from '../../components/ui/Chargement'
import { Carte } from '../../components/ui/Carte'
import { OngletTextes } from './onglets/OngletTextes'
import { OngletVisuels } from './onglets/OngletVisuels'
import { OngletVideos } from './onglets/OngletVideos'
import { OngletVoix } from './onglets/OngletVoix'
import { OngletReseaux } from './onglets/OngletReseaux'
import type { Produit } from '../../types/database'

// Studio de création : par produit, onglets Textes / Visuels / Vidéos / Voix / Réseaux.

const onglets = [
  { id: 'textes', label: '✍️ Textes' },
  { id: 'visuels', label: '🖼️ Visuels' },
  { id: 'videos', label: '🎬 Vidéos' },
  { id: 'voix', label: '🎙️ Voix' },
  { id: 'reseaux', label: '📱 Réseaux' },
] as const

type OngletId = (typeof onglets)[number]['id']

export function StudioPage() {
  const { id } = useParams<{ id: string }>()
  const [produit, setProduit] = useState<Produit | null | undefined>(undefined)
  const [onglet, setOnglet] = useState<OngletId>('textes')

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from('produits').select('*').eq('id', id).maybeSingle()
      setProduit((data as Produit) ?? null)
    }
    void charger()
  }, [id])

  if (produit === undefined) return <Chargement message="Ouverture du studio…" />
  if (produit === null) {
    return (
      <Carte className="mt-8 text-center">
        <p>Produit introuvable.</p>
        <Link to="/accueil" className="mt-2 block font-semibold text-terracotta">← Retour</Link>
      </Carte>
    )
  }
  if (produit.statut_moderation !== 'approuve') {
    return (
      <Carte className="mt-8 text-center">
        <p>Ce produit n'est pas encore approuvé : le studio s'ouvrira dès sa validation. ⏳</p>
        <Link to="/accueil" className="mt-2 block font-semibold text-terracotta">← Retour</Link>
      </Carte>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête produit */}
      <div className="flex items-center gap-3">
        {produit.photos[0] && (
          <img src={produit.photos[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />
        )}
        <div>
          <h1 className="font-bold">{produit.nom}</h1>
          <p className="text-sm text-encre-douce">Studio de création</p>
        </div>
      </div>

      {/* Onglets défilables */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {onglets.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              onglet === o.id ? 'bg-terracotta text-white' : 'bg-carte border border-encre/10'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'textes' && <OngletTextes produit={produit} />}
      {onglet === 'visuels' && <OngletVisuels produit={produit} />}
      {onglet === 'videos' && <OngletVideos produit={produit} />}
      {onglet === 'voix' && <OngletVoix produit={produit} />}
      {onglet === 'reseaux' && <OngletReseaux produit={produit} />}
    </div>
  )
}
