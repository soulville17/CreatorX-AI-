import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, appelerFonction } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Bouton } from '../../components/ui/Bouton'
import { Carte } from '../../components/ui/Carte'
import { MessageErreur } from '../../components/ui/MessageErreur'
import type { AnalyseMarketing } from '../../types/database'

// Ajout produit : 2-3 photos, nom, prix FCFA, description courte.
// Modération automatique en arrière-plan, puis analyse de l'Agent Marketing.

export function AjoutProduitPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const [photos, setPhotos] = useState<File[]>([])
  const [apercus, setApercus] = useState<string[]>([])
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('')
  const [description, setDescription] = useState('')
  const [etat, setEtat] = useState<'formulaire' | 'moderation' | 'analyse' | 'resultat' | 'rejete'>('formulaire')
  const [analyse, setAnalyse] = useState<AnalyseMarketing | null>(null)
  const [raisonRejet, setRaisonRejet] = useState('')
  const [produitId, setProduitId] = useState<string | null>(null)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  function choisirPhotos(e: ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []).slice(0, 3)
    setPhotos(fichiers)
    setApercus(fichiers.map((f) => URL.createObjectURL(f)))
  }

  async function soumettre() {
    setErreurMsg(null)
    if (photos.length === 0) return setErreurMsg('Ajoute au moins une photo de ton produit.')
    if (nom.trim().length < 2) return setErreurMsg('Donne un nom à ton produit.')
    const prixNum = parseInt(prix, 10)
    if (!prixNum || prixNum <= 0) return setErreurMsg('Indique le prix en FCFA.')

    setEtat('moderation')
    try {
      // 1. Upload des photos dans Storage (dossier de l'utilisateur)
      const urls: string[] = []
      for (const photo of photos) {
        const chemin = `${session!.user.id}/${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
        const { error } = await supabase.storage.from('produits').upload(chemin, photo)
        if (error) throw new Error("L'envoi des photos a échoué. Vérifie ta connexion.")
        urls.push(supabase.storage.from('produits').getPublicUrl(chemin).data.publicUrl)
      }

      // 2. Création du produit
      const { data: produit, error: insertErr } = await supabase
        .from('produits')
        .insert({
          user_id: session!.user.id,
          nom: nom.trim(),
          description: description.trim(),
          prix_fcfa: prixNum,
          photos: urls,
        })
        .select()
        .single()
      if (insertErr) throw new Error("L'enregistrement du produit a échoué.")
      setProduitId(produit.id)

      // 3. Modération automatique (Agent invisible)
      const moderation = await appelerFonction<{ statut: string; raison: string }>(
        'moderate-product',
        { produit_id: produit.id }
      )
      if (moderation.statut === 'rejete') {
        setRaisonRejet(moderation.raison)
        setEtat('rejete')
        return
      }
      if (moderation.statut === 'en_attente') {
        // Doute → file de modération manuelle : on prévient gentiment
        setRaisonRejet(
          "Ton produit est en cours de vérification par notre équipe. Tu recevras une réponse très vite."
        )
        setEtat('rejete')
        return
      }

      // 4. Analyse de l'Agent Marketing 🎯
      setEtat('analyse')
      const { analyse } = await appelerFonction<{ analyse: AnalyseMarketing }>(
        'agent-marketing',
        { produit_id: produit.id }
      )
      setAnalyse(analyse)
      setEtat('resultat')
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : "Une erreur s'est produite. Réessaie.")
      setEtat('formulaire')
    }
  }

  if (etat === 'moderation' || etat === 'analyse') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-or/30 border-t-or" />
        <p className="font-semibold">
          {etat === 'moderation'
            ? 'Vérification de ton produit… 🔍'
            : '🎯 Notre Agent Marketing analyse ton produit…'}
        </p>
        <p className="text-sm text-encre-douce">Quelques secondes, pas plus.</p>
      </div>
    )
  }

  if (etat === 'rejete') {
    return (
      <div className="flex flex-col gap-4 py-8">
        <Carte>
          <p className="text-lg font-bold">Petit souci avec ce produit 😕</p>
          <p className="mt-2 text-encre-douce">{raisonRejet}</p>
        </Carte>
        <Bouton pleineLargeur onClick={() => navigate('/accueil')}>Retour à l'accueil</Bouton>
      </div>
    )
  }

  if (etat === 'resultat' && analyse) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <h1 className="text-xl font-bold">🎯 L'avis de ton Agent Marketing</h1>
        <Carte>
          <p className="font-semibold">Comment le vendre</p>
          <p className="mt-1 text-sm text-encre-douce">{analyse.positionnement}</p>
        </Carte>
        <Carte>
          <p className="font-semibold">Tes arguments qui font acheter</p>
          <ul className="mt-1 list-inside list-disc text-sm text-encre-douce">
            {analyse.arguments_vente.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </Carte>
        <Carte>
          <p className="font-semibold">Le prix du marché</p>
          <p className="mt-1 text-sm text-encre-douce">{analyse.fourchette_prix_marche}</p>
        </Carte>
        <Carte>
          <p className="font-semibold">Ton client type</p>
          <p className="mt-1 text-sm text-encre-douce">{analyse.profil_acheteur}</p>
        </Carte>
        <Bouton pleineLargeur onClick={() => navigate(`/produits/${produitId}/studio`)}>
          Créer ma pub maintenant 🎨
        </Bouton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-xl font-bold">Ajouter un produit 📦</h1>

      {/* Photos */}
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-or/40 bg-or/5 p-4 text-center">
        <span className="text-2xl">📸</span>
        <span className="text-sm font-semibold">Tes photos (2-3 photos)</span>
        <span className="text-xs text-encre-douce">Prends-les en pleine lumière</span>
        <input type="file" accept="image/*" multiple onChange={choisirPhotos} className="hidden" />
      </label>
      {apercus.length > 0 && (
        <div className="flex gap-2">
          {apercus.map((src) => (
            <img key={src} src={src} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <input
        placeholder="Nom du produit (ex : Robe wax élégante)"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="Prix en FCFA (ex : 15000)"
        value={prix}
        onChange={(e) => setPrix(e.target.value)}
        className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
      />
      <textarea
        placeholder="Décris ton produit en quelques mots (matière, taille, ce qui le rend spécial…)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
      />

      <MessageErreur message={erreurMsg} />
      <Bouton pleineLargeur onClick={soumettre}>Enregistrer mon produit ✅</Bouton>
    </div>
  )
}
