import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Carte } from '../../components/ui/Carte'

// Landing page publique : promesse, les 8 agents, cibles, tarifs, témoignages.

const agents = [
  { emoji: '🎯', nom: 'Agent Marketing', role: 'Analyse ton produit et trouve comment le vendre' },
  { emoji: '✍️', nom: 'Agent Copywriter', role: 'Écrit tes textes de vente qui font acheter' },
  { emoji: '🎬', nom: 'Agent Vidéo', role: 'Crée tes vidéos publicitaires professionnelles' },
  { emoji: '🎙️', nom: 'Agent Voix', role: 'Ajoute une voix off naturelle en français' },
  { emoji: '📱', nom: 'Agent Réseaux sociaux', role: 'Adapte tes pubs pour TikTok, Insta, Facebook…' },
  { emoji: '📢', nom: 'Agent Publicité', role: 'Prépare tes campagnes ciblées sur les vrais acheteurs' },
  { emoji: '📊', nom: 'Agent Analyse', role: 'T’explique tes résultats en langage simple' },
  { emoji: '🔄', nom: 'Agent Optimisation', role: 'Améliore tes campagnes jour après jour' },
]

const cibles = [
  'Boutiques en ligne', 'Vendeuses Facebook & TikTok', 'Restaurants', 'Salons de coiffure',
  'Cliniques', 'Auto', 'Immobilier', 'E-commerce', 'Centres de formation',
]

const packs = [
  { nom: 'Découverte', prix: '2 000 FCFA', credits: '15 crédits', detail: 'Pour essayer' },
  { nom: 'Vendeuse', prix: '5 000 FCFA', credits: '45 crédits', detail: 'Le plus choisi ⭐', star: true },
  { nom: 'Pro PME', prix: '15 000 FCFA', credits: '150 crédits', detail: 'Pour les boutiques actives' },
]

const temoignages = [
  { nom: 'Aïcha, vendeuse de robes à Cocody', texte: '« Mes vidéos sont plus belles que celles des grandes boutiques. Les clientes m’écrivent chaque jour. »' },
  { nom: 'Konan, restaurant à Marcory', texte: '« Je paie ma pub avec Orange Money, sans carte bancaire. La campagne m’a ramené 60 nouveaux clients. »' },
]

export function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[480px] px-5 pb-16">
      {/* En-tête */}
      <header className="flex items-center justify-between py-4">
        <span className="text-xl font-extrabold">
          Creator<span className="text-terracotta">X</span><span className="text-or"> AI</span>
        </span>
        <Link to="/connexion" className="text-sm font-semibold text-terracotta">
          Se connecter
        </Link>
      </header>

      {/* Promesse */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-8 text-center"
      >
        <h1 className="text-3xl font-extrabold leading-tight">
          Dépose ton produit.<br />
          <span className="text-terracotta">Nos agents IA font ta pub.</span>
        </h1>
        <p className="mt-4 text-encre-douce">
          Vidéos publicitaires professionnelles, contenus pour tes réseaux, campagnes
          ciblées sur les vrais acheteurs — et tu paies avec <strong>Wave</strong> ou{' '}
          <strong>Orange Money</strong>, sans carte bancaire.
        </p>
        <Link
          to="/connexion"
          className="btn mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-terracotta px-6 py-4 text-lg font-bold text-white shadow-lg shadow-terracotta/25 active:bg-terracotta-fonce"
        >
          Commencer gratuitement 🎁
        </Link>
        <p className="mt-2 text-xs text-encre-douce">5 crédits offerts à l’inscription</p>
      </motion.section>

      {/* Les 8 agents */}
      <section className="py-6">
        <h2 className="mb-4 text-xl font-bold">Ton équipe de 8 agents IA 🤝</h2>
        <div className="grid grid-cols-1 gap-3">
          {agents.map((a, i) => (
            <motion.div
              key={a.nom}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <Carte className="flex items-center gap-3">
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <p className="font-semibold">{a.nom}</p>
                  <p className="text-sm text-encre-douce">{a.role}</p>
                </div>
              </Carte>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cibles */}
      <section className="py-6">
        <h2 className="mb-3 text-xl font-bold">Fait pour ton activité</h2>
        <div className="flex flex-wrap gap-2">
          {cibles.map((c) => (
            <span key={c} className="rounded-full bg-or/10 px-3 py-1.5 text-sm font-medium text-or-fonce">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-6">
        <h2 className="mb-4 text-xl font-bold">Des prix simples, en FCFA</h2>
        <div className="grid gap-3">
          {packs.map((p) => (
            <Carte key={p.nom} className={p.star ? 'border-2 border-or' : ''}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{p.nom}</p>
                  <p className="text-sm text-encre-douce">{p.detail}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-terracotta">{p.prix}</p>
                  <p className="text-sm text-encre-douce">{p.credits}</p>
                </div>
              </div>
            </Carte>
          ))}
        </div>
        <p className="mt-3 text-sm text-encre-douce">
          Campagnes publicitaires à partir de <strong>10 000 FCFA</strong>, payables en mobile money.
        </p>
      </section>

      {/* Témoignages (placeholders) */}
      <section className="py-6">
        <h2 className="mb-4 text-xl font-bold">Elles nous font confiance</h2>
        <div className="grid gap-3">
          {temoignages.map((t) => (
            <Carte key={t.nom}>
              <p className="italic">{t.texte}</p>
              <p className="mt-2 text-sm font-semibold text-encre-douce">{t.nom}</p>
            </Carte>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-8 text-center">
        <Link
          to="/connexion"
          className="btn inline-flex w-full items-center justify-center rounded-2xl bg-or px-6 py-4 text-lg font-bold text-white shadow-lg shadow-or/25 active:bg-or-fonce"
        >
          Créer ma première pub 🚀
        </Link>
      </section>

      <footer className="border-t border-encre/10 py-6 text-center text-xs text-encre-douce">
        CreatorX AI — Abidjan, Côte d'Ivoire · Paiements sécurisés par CinetPay
      </footer>
    </div>
  )
}
