import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Carte } from '../../components/ui/Carte'
import { Chargement } from '../../components/ui/Chargement'
import { formaterFCFA } from '../../lib/credits'
import type { Campagne, StatJour } from '../../types/database'

// 📊 Suivi de campagne (client) : statut + résumés quotidiens de l'Agent Analyse
// + recommandations de l'Agent Optimisation.

const libellesStatut: Record<string, string> = {
  brouillon: '📝 Brouillon — paiement en attente',
  payee: '🕐 Payée — lancement sous 24 h',
  en_cours: '🟢 En diffusion',
  terminee: '🏁 Terminée',
  rejetee: '❌ Refusée',
}

interface Recos {
  diagnostic?: string
  recommandations?: { action: string; pourquoi: string }[]
}

export function SuiviCampagnePage() {
  const { id } = useParams<{ id: string }>()
  const [campagne, setCampagne] = useState<Campagne | null | undefined>(undefined)

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from('campagnes').select('*').eq('id', id).maybeSingle()
      setCampagne((data as Campagne) ?? null)
    }
    void charger()
  }, [id])

  if (campagne === undefined) return <Chargement message="Chargement de ta campagne…" />
  if (campagne === null) return <Carte className="mt-8 text-center">Campagne introuvable.</Carte>

  const stats = (campagne.stats_quotidiennes ?? []) as StatJour[]
  const recos = campagne.recommandations_optimisation as Recos | null
  const totaux = stats.reduce(
    (t, s) => ({
      portee: t.portee + s.portee,
      conversations: t.conversations + s.conversations,
      depense: t.depense + s.depense_fcfa,
    }),
    { portee: 0, conversations: 0, depense: 0 }
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Ta campagne 📢</h1>

      <Carte>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{libellesStatut[campagne.statut]}</span>
          <span className="text-sm text-encre-douce">{campagne.duree_jours} jours</span>
        </div>
        <p className="mt-1 text-sm text-encre-douce">
          Budget : {formaterFCFA(campagne.budget_client_fcfa)}
        </p>
      </Carte>

      {/* Totaux */}
      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Carte className="text-center">
            <p className="text-lg font-extrabold text-terracotta">{totaux.portee.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-encre-douce">personnes touchées</p>
          </Carte>
          <Carte className="text-center">
            <p className="text-lg font-extrabold text-succes">{totaux.conversations}</p>
            <p className="text-xs text-encre-douce">messages WhatsApp</p>
          </Carte>
          <Carte className="text-center">
            <p className="text-lg font-extrabold text-or-fonce">
              {totaux.conversations > 0
                ? formaterFCFA(Math.round(totaux.depense / totaux.conversations))
                : '—'}
            </p>
            <p className="text-xs text-encre-douce">par contact</p>
          </Carte>
        </div>
      )}

      {/* Recommandations de l'Agent Optimisation */}
      {recos?.recommandations && recos.recommandations.length > 0 && (
        <Carte className="border-2 border-or/30">
          <p className="font-semibold">🔄 Les conseils de ton Agent Optimisation</p>
          {recos.diagnostic && <p className="mt-1 text-sm text-encre-douce">{recos.diagnostic}</p>}
          <ul className="mt-2 flex flex-col gap-2">
            {recos.recommandations.map((r) => (
              <li key={r.action} className="rounded-xl bg-fond p-3 text-sm">
                <p className="font-semibold">{r.action}</p>
                <p className="text-encre-douce">{r.pourquoi}</p>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* Résumés quotidiens de l'Agent Analyse */}
      <section>
        <h2 className="mb-2 font-bold">📊 Jour par jour</h2>
        {stats.length === 0 ? (
          <Carte className="text-center text-sm text-encre-douce">
            {campagne.statut === 'en_cours'
              ? 'Les premiers résultats arrivent après 24 h de diffusion. 😉'
              : 'Les résultats apparaîtront ici dès le lancement de ta pub.'}
          </Carte>
        ) : (
          <div className="flex flex-col gap-2">
            {[...stats].reverse().map((s) => (
              <Carte key={s.date}>
                <p className="text-xs font-semibold text-encre-douce">{s.date}</p>
                <p className="mt-1 text-sm">{s.resume_client ?? `Portée ${s.portee.toLocaleString('fr-FR')}, ${s.conversations} conversations.`}</p>
                {s.signaux && s.signaux.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {s.signaux.map((sig) => (
                      <p key={sig} className="rounded-lg bg-or/10 px-2 py-1 text-xs text-or-fonce">
                        ⚠️ {sig}
                      </p>
                    ))}
                  </div>
                )}
              </Carte>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
