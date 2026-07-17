import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Bouton } from '../../components/ui/Bouton'
import { MessageErreur } from '../../components/ui/MessageErreur'
import type { TypeActivite } from '../../types/database'

// Onboarding en 2 écrans après l'inscription :
// 1. prénom + numéro WhatsApp — 2. ville + type d'activité.

const activites: { valeur: TypeActivite; label: string }[] = [
  { valeur: 'mode', label: '👗 Mode & vêtements' },
  { valeur: 'cosmetiques', label: '💄 Cosmétiques' },
  { valeur: 'alimentation', label: '🍚 Alimentation' },
  { valeur: 'restaurant', label: '🍽️ Restaurant' },
  { valeur: 'beaute', label: '💇🏾‍♀️ Coiffure & beauté' },
  { valeur: 'sante', label: '🏥 Santé / clinique' },
  { valeur: 'auto', label: '🚗 Auto' },
  { valeur: 'immobilier', label: '🏠 Immobilier' },
  { valeur: 'formation', label: '🎓 Formation' },
  { valeur: 'services', label: '🛠️ Services' },
  { valeur: 'autre', label: '✨ Autre' },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { session, rechargerProfil } = useAuthStore()
  const [etape, setEtape] = useState(1)
  const [nom, setNom] = useState('')
  const [whatsapp, setWhatsapp] = useState('+225')
  const [ville, setVille] = useState('')
  const [activite, setActivite] = useState<TypeActivite | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  if (!session) return <Navigate to="/connexion" replace />

  function validerEtape1() {
    if (nom.trim().length < 2) return setErreurMsg('Dis-nous ton prénom 😊')
    // Numéro international : + suivi de 8 à 15 chiffres
    if (!/^\+\d{8,15}$/.test(whatsapp.replace(/\s/g, ''))) {
      return setErreurMsg('Ton numéro WhatsApp doit commencer par +225 (ex : +2250701020304).')
    }
    setErreurMsg(null)
    setEtape(2)
  }

  async function terminer() {
    if (!ville.trim()) return setErreurMsg('Indique ta ville.')
    if (!activite) return setErreurMsg('Choisis ton type d’activité.')
    setErreurMsg(null)
    setChargement(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nom: nom.trim(),
          numero_whatsapp: whatsapp.replace(/\s/g, ''),
          ville: ville.trim(),
          type_activite: activite,
        })
        .eq('id', session!.user.id)
      if (error) throw error
      await rechargerProfil()
      navigate('/accueil')
    } catch {
      setErreurMsg("L'enregistrement a échoué. Réessaie.")
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-8">
      <p className="mb-2 text-sm font-semibold text-or-fonce">Étape {etape} sur 2</p>
      <AnimatePresence mode="wait">
        {etape === 1 ? (
          <motion.div
            key="etape1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col gap-3"
          >
            <h1 className="text-2xl font-bold">Fais connaissance avec ton équipe 🤝</h1>
            <p className="mb-2 text-encre-douce">Comment tes clients t'appellent-ils ?</p>
            <input
              placeholder="Ton prénom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
            />
            <input
              type="tel"
              placeholder="Ton numéro WhatsApp (+225...)"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
            />
            <p className="text-xs text-encre-douce">
              C'est sur ce numéro que tes clients te contacteront depuis tes pubs.
            </p>
            <MessageErreur message={erreurMsg} />
            <Bouton pleineLargeur onClick={validerEtape1}>Continuer →</Bouton>
          </motion.div>
        ) : (
          <motion.div
            key="etape2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col gap-3"
          >
            <h1 className="text-2xl font-bold">Ton activité 🏪</h1>
            <input
              placeholder="Ta ville (ex : Abidjan)"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
            />
            <div className="flex flex-wrap gap-2">
              {activites.map((a) => (
                <button
                  key={a.valeur}
                  type="button"
                  onClick={() => setActivite(a.valeur)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                    activite === a.valeur
                      ? 'bg-terracotta text-white'
                      : 'bg-carte border border-encre/15'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <MessageErreur message={erreurMsg} />
            <Bouton pleineLargeur chargement={chargement} onClick={terminer}>
              C'est parti ! 🎉
            </Bouton>
            <button type="button" onClick={() => setEtape(1)} className="text-sm text-encre-douce">
              ← Retour
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
