import { useEffect, useState } from 'react'
import { supabase, appelerFonction } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Bouton } from '../../components/ui/Bouton'
import { Carte } from '../../components/ui/Carte'
import { MessageErreur } from '../../components/ui/MessageErreur'
import {
  BUDGETS_CAMPAGNE,
  BUDGET_CAMPAGNE_MIN,
  formaterFCFA,
} from '../../lib/credits'
import type { Produit } from '../../types/database'

// 📢 Lancer une campagne — 3 étapes :
// (a) choisir le produit, (b) l'Agent Publicité propose le ciblage (modifiable),
// (c) récapitulatif + paiement Wave / Orange Money via CinetPay.

interface Brief {
  ciblage: {
    villes: string[]
    genre: string
    age_min: number
    age_max: number
    interets_meta: string[]
  }
  texte_principal: string
  accroches: string[]
  budget_quotidien_meta_fcfa: number
  checklist_lancement: string[]
}

export function NouvelleCampagnePage() {
  const session = useAuthStore((s) => s.session)
  const [etape, setEtape] = useState(1)
  const [produits, setProduits] = useState<Produit[]>([])
  const [produitId, setProduitId] = useState<string | null>(null)
  const [budget, setBudget] = useState(BUDGETS_CAMPAGNE[0])
  const [budgetLibre, setBudgetLibre] = useState('')
  const [duree, setDuree] = useState(7)
  const [campagneId, setCampagneId] = useState<string | null>(null)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [villes, setVilles] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from('produits')
        .select('*')
        .eq('statut_moderation', 'approuve')
        .order('created_at', { ascending: false })
      setProduits((data as Produit[]) ?? [])
    }
    void charger()
  }, [])

  const budgetFinal = budgetLibre ? parseInt(budgetLibre, 10) || 0 : budget

  // Étape 1 → 2 : création du brouillon + brief de l'Agent Publicité
  async function preparerCampagne() {
    setErreurMsg(null)
    if (!produitId) return setErreurMsg('Choisis le produit à promouvoir.')
    if (budgetFinal < BUDGET_CAMPAGNE_MIN) {
      return setErreurMsg(`Le budget minimum est de ${formaterFCFA(BUDGET_CAMPAGNE_MIN)}.`)
    }
    setChargement(true)
    try {
      const { data: campagne, error } = await supabase
        .from('campagnes')
        .insert({
          user_id: session!.user.id,
          produit_id: produitId,
          budget_client_fcfa: budgetFinal,
          budget_meta_fcfa: Math.round(budgetFinal * 0.65),
          duree_jours: duree,
        })
        .select()
        .single()
      if (error) throw new Error('La création de la campagne a échoué.')
      setCampagneId(campagne.id)

      const res = await appelerFonction<{ brief: Brief }>('agent-publicite', {
        campagne_id: campagne.id,
      })
      setBrief(res.brief)
      setVilles(res.brief.ciblage.villes.join(', '))
      setEtape(2)
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setChargement(false)
    }
  }

  // Étape 2 → 3 : enregistrement des ajustements de ciblage
  async function validerCiblage() {
    setChargement(true)
    try {
      await supabase
        .from('campagnes')
        .update({
          ciblage_villes: villes.split(',').map((v) => v.trim()).filter(Boolean),
        })
        .eq('id', campagneId)
      setEtape(3)
    } finally {
      setChargement(false)
    }
  }

  // Étape 3 : paiement CinetPay
  async function payer() {
    setErreurMsg(null)
    setChargement(true)
    try {
      const res = await appelerFonction<{ url_paiement: string }>('create-payment', {
        type: 'campagne',
        campagne_id: campagneId,
      })
      window.location.href = res.url_paiement
    } catch (err) {
      setErreurMsg(err instanceof Error ? err.message : 'Le paiement a échoué.')
      setChargement(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Lancer ma campagne 📢</h1>
      <p className="text-sm font-semibold text-or-fonce">Étape {etape} sur 3</p>

      {etape === 1 && (
        <>
          <p className="font-semibold">Quel produit veux-tu faire connaître ?</p>
          {produits.length === 0 && (
            <Carte className="text-center text-sm text-encre-douce">
              Ajoute d'abord un produit approuvé pour lancer une campagne.
            </Carte>
          )}
          <div className="grid gap-2">
            {produits.map((p) => (
              <button key={p.id} onClick={() => setProduitId(p.id)} className="text-left">
                <Carte
                  className={`flex items-center gap-3 ${produitId === p.id ? 'border-2 border-terracotta' : ''}`}
                >
                  {p.photos[0] && (
                    <img src={p.photos[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  )}
                  <div>
                    <p className="font-semibold">{p.nom}</p>
                    <p className="text-sm text-encre-douce">{formaterFCFA(p.prix_fcfa)}</p>
                  </div>
                </Carte>
              </button>
            ))}
          </div>

          <p className="font-semibold">Ton budget publicitaire</p>
          <div className="flex gap-2">
            {BUDGETS_CAMPAGNE.map((b) => (
              <button
                key={b}
                onClick={() => {
                  setBudget(b)
                  setBudgetLibre('')
                }}
                className={`flex-1 rounded-2xl px-2 py-3 text-sm font-bold ${
                  !budgetLibre && budget === b ? 'bg-terracotta text-white' : 'bg-carte border border-encre/10'
                }`}
              >
                {formaterFCFA(b)}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            placeholder={`Ou budget libre (minimum ${formaterFCFA(BUDGET_CAMPAGNE_MIN)})`}
            value={budgetLibre}
            onChange={(e) => setBudgetLibre(e.target.value)}
            className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
          />

          <p className="font-semibold">Durée de la campagne</p>
          <div className="flex gap-2">
            {[5, 7, 14].map((j) => (
              <button
                key={j}
                onClick={() => setDuree(j)}
                className={`flex-1 rounded-2xl px-2 py-3 text-sm font-bold ${
                  duree === j ? 'bg-terracotta text-white' : 'bg-carte border border-encre/10'
                }`}
              >
                {j} jours
              </button>
            ))}
          </div>

          <MessageErreur message={erreurMsg} />
          <Bouton pleineLargeur chargement={chargement} onClick={preparerCampagne}>
            {chargement ? 'Ton Agent Publicité prépare le ciblage…' : 'Continuer →'}
          </Bouton>
        </>
      )}

      {etape === 2 && brief && (
        <>
          <Carte>
            <p className="font-semibold">📢 Le plan de ton Agent Publicité</p>
            <p className="mt-2 text-sm text-encre-douce">{brief.texte_principal}</p>
          </Carte>
          <Carte>
            <p className="font-semibold">Qui verra ta pub</p>
            <p className="mt-1 text-sm text-encre-douce">
              {brief.ciblage.genre === 'tous' ? 'Femmes et hommes' : brief.ciblage.genre} de{' '}
              {brief.ciblage.age_min} à {brief.ciblage.age_max} ans, intéressés par ton domaine.
            </p>
            <label className="mt-3 block text-sm font-semibold">Villes (modifiable) :</label>
            <input
              value={villes}
              onChange={(e) => setVilles(e.target.value)}
              className="mt-1 w-full rounded-xl border border-encre/15 px-3 py-2.5 text-sm"
            />
          </Carte>
          <Carte>
            <p className="font-semibold">Tes accroches</p>
            <ul className="mt-1 list-inside list-disc text-sm text-encre-douce">
              {brief.accroches.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </Carte>
          <Bouton pleineLargeur chargement={chargement} onClick={validerCiblage}>
            C'est bon pour moi →
          </Bouton>
        </>
      )}

      {etape === 3 && (
        <>
          <Carte>
            <p className="text-lg font-bold">Récapitulatif 🧾</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-encre-douce">Budget de ta campagne</span>
                <span className="font-bold">{formaterFCFA(budgetFinal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-encre-douce">Durée</span>
                <span className="font-bold">{duree} jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-encre-douce">Objectif</span>
                <span className="font-bold">Messages WhatsApp 🟢</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-encre-douce">
              Ta campagne sera vérifiée et lancée par notre équipe sous 24 h après paiement.
            </p>
          </Carte>
          <MessageErreur message={erreurMsg} />
          <Bouton pleineLargeur chargement={chargement} onClick={payer}>
            Payer avec Wave / Orange Money 📲
          </Bouton>
        </>
      )}
    </div>
  )
}
