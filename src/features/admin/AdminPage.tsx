import { useCallback, useEffect, useState } from 'react'
import { supabase, appelerFonction } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Carte } from '../../components/ui/Carte'
import { Bouton } from '../../components/ui/Bouton'
import { MessageErreur } from '../../components/ui/MessageErreur'
import { formaterFCFA } from '../../lib/credits'
import type { Campagne, Paiement, Produit } from '../../types/database'

// 🛠️ Espace admin (is_admin) :
//  - campagnes payées à traiter (brief copiable, changement de statut)
//  - saisie des stats quotidiennes → Agent Analyse (+ Agent Optimisation)
//  - file de modération manuelle
//  - paiements
//  - tableau des coûts API (rentabilité)

type Section = 'campagnes' | 'moderation' | 'paiements' | 'couts'

export function AdminPage() {
  const profile = useAuthStore((s) => s.profile)
  const [section, setSection] = useState<Section>('campagnes')

  if (!profile?.is_admin) {
    return <Carte className="mt-8 text-center">Espace réservé à l'administrateur. 🔒</Carte>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Espace admin 🛠️</h1>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(
          [
            ['campagnes', '📢 Campagnes'],
            ['moderation', '🔍 Modération'],
            ['paiements', '💳 Paiements'],
            ['couts', '📈 Coûts API'],
          ] as [Section, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              section === id ? 'bg-terracotta text-white' : 'bg-carte border border-encre/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'campagnes' && <SectionCampagnes />}
      {section === 'moderation' && <SectionModeration />}
      {section === 'paiements' && <SectionPaiements />}
      {section === 'couts' && <SectionCouts />}
    </div>
  )
}

// ---------- Campagnes à traiter ----------
function SectionCampagnes() {
  const [campagnes, setCampagnes] = useState<(Campagne & { produits: Produit })[]>([])
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('campagnes')
      .select('*, produits(*)')
      .in('statut', ['payee', 'en_cours'])
      .order('created_at')
    setCampagnes((data as (Campagne & { produits: Produit })[]) ?? [])
  }, [])
  useEffect(() => {
    void charger()
  }, [charger])

  async function changerStatut(id: string, statut: string) {
    const { error } = await supabase.from('campagnes').update({ statut }).eq('id', id)
    if (error) setErreurMsg('Le changement de statut a échoué.')
    else void charger()
  }

  return (
    <div className="flex flex-col gap-3">
      <MessageErreur message={erreurMsg} />
      {campagnes.length === 0 && (
        <Carte className="text-center text-sm text-encre-douce">Aucune campagne à traiter. ✅</Carte>
      )}
      {campagnes.map((c) => (
        <Carte key={c.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{c.produits?.nom}</p>
              <p className="text-sm text-encre-douce">
                {formaterFCFA(c.budget_client_fcfa)} · {c.duree_jours} j · Meta :{' '}
                {formaterFCFA(c.budget_meta_fcfa)}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                c.statut === 'payee' ? 'bg-or/10 text-or-fonce' : 'bg-succes/10 text-succes'
              }`}
            >
              {c.statut === 'payee' ? '🕐 À lancer' : '🟢 En cours'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setOuverte(ouverte === c.id ? null : c.id)}
              className="rounded-full bg-fond px-3 py-1.5 text-xs font-semibold"
            >
              {ouverte === c.id ? 'Fermer' : '📋 Brief + stats'}
            </button>
            {c.statut === 'payee' && (
              <button
                onClick={() => changerStatut(c.id, 'en_cours')}
                className="rounded-full bg-succes/10 px-3 py-1.5 text-xs font-semibold text-succes"
              >
                ▶️ Marquer lancée
              </button>
            )}
            {c.statut === 'en_cours' && (
              <button
                onClick={() => changerStatut(c.id, 'terminee')}
                className="rounded-full bg-encre/5 px-3 py-1.5 text-xs font-semibold"
              >
                🏁 Terminer
              </button>
            )}
          </div>

          {ouverte === c.id && <DetailCampagne campagne={c} onMaj={charger} />}
        </Carte>
      ))}
    </div>
  )
}

function DetailCampagne({ campagne, onMaj }: { campagne: Campagne; onMaj: () => void }) {
  const [copie, setCopie] = useState(false)
  const [stat, setStat] = useState({ date: new Date().toISOString().slice(0, 10), portee: '', clics: '', conversations: '', depense: '' })
  const [chargement, setChargement] = useState(false)
  const [optimisation, setOptimisation] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const briefTexte = JSON.stringify(campagne.brief_genere, null, 2)

  async function enregistrerStat() {
    setMessage(null)
    setChargement(true)
    try {
      // Agent Analyse : enrichit la stat d'un résumé client + signaux
      await appelerFonction('agent-analyse', {
        campagne_id: campagne.id,
        stat: {
          date: stat.date,
          portee: parseInt(stat.portee, 10) || 0,
          clics: parseInt(stat.clics, 10) || 0,
          conversations: parseInt(stat.conversations, 10) || 0,
          depense_fcfa: parseInt(stat.depense, 10) || 0,
        },
      })
      setMessage('✅ Stats enregistrées et résumé client généré.')
      onMaj()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Échec de l’enregistrement.')
    } finally {
      setChargement(false)
    }
  }

  async function lancerOptimisation() {
    setMessage(null)
    setOptimisation(true)
    try {
      await appelerFonction('agent-optimisation', { campagne_id: campagne.id })
      setMessage('✅ Recommandations générées (visibles par le client et ci-dessous).')
      onMaj()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "L'optimisation a échoué.")
    } finally {
      setOptimisation(false)
    }
  }

  const recos = campagne.recommandations_optimisation as {
    recommandations?: { action: string; pour_admin: string }[]
  } | null

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-encre/10 pt-3">
      {/* Brief copiable */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Brief de lancement (Meta Ads Manager)</p>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(briefTexte)
              setCopie(true)
              setTimeout(() => setCopie(false), 1500)
            }}
            className="rounded-full bg-fond px-3 py-1 text-xs font-semibold"
          >
            {copie ? '✅ Copié' : '📋 Copier le brief'}
          </button>
        </div>
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-encre/5 p-3 text-[11px]">
          {briefTexte}
        </pre>
      </div>

      {/* Saisie des stats quotidiennes */}
      <div>
        <p className="text-sm font-semibold">Saisir les stats du jour</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input type="date" value={stat.date} onChange={(e) => setStat({ ...stat, date: e.target.value })} className="rounded-xl border border-encre/15 px-3 py-2 text-sm" />
          <input type="number" placeholder="Portée" value={stat.portee} onChange={(e) => setStat({ ...stat, portee: e.target.value })} className="rounded-xl border border-encre/15 px-3 py-2 text-sm" />
          <input type="number" placeholder="Clics" value={stat.clics} onChange={(e) => setStat({ ...stat, clics: e.target.value })} className="rounded-xl border border-encre/15 px-3 py-2 text-sm" />
          <input type="number" placeholder="Conversations" value={stat.conversations} onChange={(e) => setStat({ ...stat, conversations: e.target.value })} className="rounded-xl border border-encre/15 px-3 py-2 text-sm" />
          <input type="number" placeholder="Dépense (FCFA)" value={stat.depense} onChange={(e) => setStat({ ...stat, depense: e.target.value })} className="col-span-2 rounded-xl border border-encre/15 px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 flex gap-2">
          <Bouton chargement={chargement} onClick={enregistrerStat} className="!py-2 text-sm">
            📊 Enregistrer + analyser
          </Bouton>
          <Bouton variante="secondaire" chargement={optimisation} onClick={lancerOptimisation} className="!py-2 text-sm">
            🔄 Optimiser
          </Bouton>
        </div>
        {message && <p className="mt-2 text-xs text-encre-douce">{message}</p>}
      </div>

      {/* Instructions admin de l'Agent Optimisation */}
      {recos?.recommandations && (
        <div>
          <p className="text-sm font-semibold">À appliquer dans Ads Manager :</p>
          <ul className="mt-1 list-inside list-disc text-xs text-encre-douce">
            {recos.recommandations.map((r) => (
              <li key={r.action}>{r.pour_admin}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------- File de modération manuelle ----------
function SectionModeration() {
  const [produits, setProduits] = useState<Produit[]>([])

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('produits')
      .select('*')
      .eq('statut_moderation', 'en_attente')
      .order('created_at')
    setProduits((data as Produit[]) ?? [])
  }, [])
  useEffect(() => {
    void charger()
  }, [charger])

  async function decider(id: string, statut: 'approuve' | 'rejete') {
    let raison: string | null = null
    if (statut === 'rejete') {
      raison = window.prompt('Raison du refus (en français simple, visible par le client) :')
      if (!raison) return
    }
    await supabase.from('produits').update({ statut_moderation: statut, raison_rejet: raison }).eq('id', id)
    void charger()
  }

  return (
    <div className="flex flex-col gap-3">
      {produits.length === 0 && (
        <Carte className="text-center text-sm text-encre-douce">Aucun produit en attente. ✅</Carte>
      )}
      {produits.map((p) => (
        <Carte key={p.id}>
          <div className="flex gap-3">
            {p.photos[0] && <img src={p.photos[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="font-bold">{p.nom}</p>
              <p className="text-sm text-encre-douce">{formaterFCFA(p.prix_fcfa)}</p>
              <p className="mt-1 line-clamp-2 text-xs text-encre-douce">{p.description}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decider(p.id, 'approuve')} className="rounded-full bg-succes/10 px-3 py-1.5 text-xs font-semibold text-succes">
              ✅ Approuver
            </button>
            <button onClick={() => decider(p.id, 'rejete')} className="rounded-full bg-erreur/10 px-3 py-1.5 text-xs font-semibold text-erreur">
              ❌ Refuser
            </button>
          </div>
        </Carte>
      ))}
    </div>
  )
}

// ---------- Paiements ----------
function SectionPaiements() {
  const [paiements, setPaiements] = useState<Paiement[]>([])

  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from('paiements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setPaiements((data as Paiement[]) ?? [])
    }
    void charger()
  }, [])

  const badges: Record<string, string> = {
    initie: 'bg-or/10 text-or-fonce',
    confirme: 'bg-succes/10 text-succes',
    echoue: 'bg-erreur/10 text-erreur',
  }

  return (
    <div className="flex flex-col gap-2">
      {paiements.length === 0 && (
        <Carte className="text-center text-sm text-encre-douce">Aucun paiement pour l'instant.</Carte>
      )}
      {paiements.map((p) => (
        <Carte key={p.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold">
              {p.type === 'credits' ? '⚡ Crédits' : '📢 Campagne'} · {formaterFCFA(p.montant_fcfa)}
            </p>
            <p className="text-xs text-encre-douce">
              {new Date(p.created_at).toLocaleString('fr-FR')} · {p.reference_cinetpay}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badges[p.statut]}`}>
            {p.statut}
          </span>
        </Carte>
      ))}
    </div>
  )
}

// ---------- Tableau des coûts API ----------
interface LigneCout {
  jour: string
  agent: string
  total_fcfa: number
  nb: number
}

function SectionCouts() {
  const [lignes, setLignes] = useState<LigneCout[]>([])

  useEffect(() => {
    async function charger() {
      // Agrégation côté client sur les 30 derniers jours (volume MVP faible)
      const depuis = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      const { data } = await supabase
        .from('generations')
        .select('agent, cout_api_estime_fcfa, created_at')
        .gte('created_at', depuis)
      const groupes = new Map<string, LigneCout>()
      for (const g of data ?? []) {
        const jour = (g.created_at as string).slice(0, 10)
        const cle = `${jour}|${g.agent}`
        const ligne = groupes.get(cle) ?? { jour, agent: g.agent as string, total_fcfa: 0, nb: 0 }
        ligne.total_fcfa += Number(g.cout_api_estime_fcfa)
        ligne.nb += 1
        groupes.set(cle, ligne)
      }
      setLignes(
        [...groupes.values()].sort((a, b) => b.jour.localeCompare(a.jour) || a.agent.localeCompare(b.agent))
      )
    }
    void charger()
  }, [])

  const totalGlobal = lignes.reduce((t, l) => t + l.total_fcfa, 0)

  return (
    <div className="flex flex-col gap-3">
      <Carte className="text-center">
        <p className="text-sm text-encre-douce">Coûts API — 30 derniers jours</p>
        <p className="text-2xl font-extrabold text-terracotta">{formaterFCFA(Math.round(totalGlobal))}</p>
      </Carte>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-encre/10 text-left text-xs text-encre-douce">
              <th className="py-2">Jour</th>
              <th>Agent</th>
              <th className="text-right">Générations</th>
              <th className="text-right">Coût</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={`${l.jour}-${l.agent}`} className="border-b border-encre/5">
                <td className="py-2">{l.jour}</td>
                <td>{l.agent}</td>
                <td className="text-right">{l.nb}</td>
                <td className="text-right font-semibold">{Math.round(l.total_fcfa)} F</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
