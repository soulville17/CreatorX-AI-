import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Carte } from '../../components/ui/Carte'
import { Chargement } from '../../components/ui/Chargement'
import { formaterFCFA } from '../../lib/credits'
import type { Produit, Campagne } from '../../types/database'

// Accueil client : solde visible (en-tête), ajout produit, liste des produits
// avec statut de modération, accès rapides, campagnes en cours.

const badgesStatut: Record<string, { label: string; classe: string }> = {
  en_attente: { label: '⏳ En vérification', classe: 'bg-or/10 text-or-fonce' },
  approuve: { label: '✅ Approuvé', classe: 'bg-succes/10 text-succes' },
  rejete: { label: '❌ Refusé', classe: 'bg-erreur/10 text-erreur' },
}

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const [produits, setProduits] = useState<Produit[] | null>(null)
  const [campagnes, setCampagnes] = useState<Campagne[]>([])

  useEffect(() => {
    async function charger() {
      const [prodRes, campRes] = await Promise.all([
        supabase.from('produits').select('*').order('created_at', { ascending: false }),
        supabase
          .from('campagnes')
          .select('*')
          .in('statut', ['payee', 'en_cours'])
          .order('created_at', { ascending: false }),
      ])
      setProduits((prodRes.data as Produit[]) ?? [])
      setCampagnes((campRes.data as Campagne[]) ?? [])
    }
    void charger()
  }, [])

  if (!profile) return null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Bonjour {profile.nom || '👋'} !</h1>
        <p className="text-encre-douce">Que veux-tu vendre aujourd'hui ?</p>
      </div>

      {/* Bouton principal */}
      <Link
        to="/produits/nouveau"
        className="btn flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-6 py-4 text-lg font-bold text-white shadow-lg shadow-terracotta/25 active:bg-terracotta-fonce"
      >
        ➕ Ajouter un produit
      </Link>

      {/* Accès rapides */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={produits?.length ? `/produits/${produits[0].id}/studio` : '/produits/nouveau'}>
          <Carte className="text-center">
            <span className="text-2xl">🎨</span>
            <p className="mt-1 text-sm font-semibold">Créer une pub</p>
          </Carte>
        </Link>
        <Link to="/campagnes/nouvelle">
          <Carte className="text-center">
            <span className="text-2xl">📢</span>
            <p className="mt-1 text-sm font-semibold">Lancer une campagne</p>
          </Carte>
        </Link>
      </div>

      {profile.is_admin && (
        <Link to="/admin" className="text-sm font-semibold text-terracotta">
          🛠️ Espace administrateur →
        </Link>
      )}

      {/* Campagnes actives */}
      {campagnes.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Tes campagnes en cours</h2>
          <div className="grid gap-2">
            {campagnes.map((c) => (
              <Link key={c.id} to={`/campagnes/${c.id}`}>
                <Carte className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{formaterFCFA(c.budget_client_fcfa)}</p>
                    <p className="text-sm text-encre-douce">{c.duree_jours} jours</p>
                  </div>
                  <span className="rounded-full bg-succes/10 px-3 py-1 text-xs font-semibold text-succes">
                    {c.statut === 'payee' ? '🕐 Lancement en cours' : '🟢 En diffusion'}
                  </span>
                </Carte>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Liste des produits */}
      <section>
        <h2 className="mb-2 font-bold">Tes produits</h2>
        {produits === null ? (
          <Chargement message="Chargement de tes produits…" />
        ) : produits.length === 0 ? (
          <Carte className="text-center text-encre-douce">
            <p className="text-3xl">📦</p>
            <p className="mt-2 text-sm">
              Ajoute ton premier produit : nos agents s'occupent du reste !
            </p>
          </Carte>
        ) : (
          <div className="grid gap-2">
            {produits.map((p) => {
              const badge = badgesStatut[p.statut_moderation]
              return (
                <Link key={p.id} to={p.statut_moderation === 'approuve' ? `/produits/${p.id}/studio` : '#'}>
                  <Carte className="flex items-center gap-3">
                    {p.photos[0] ? (
                      <img
                        src={p.photos[0]}
                        alt={p.nom}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-fond text-2xl">📦</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.nom}</p>
                      <p className="text-sm text-encre-douce">{formaterFCFA(p.prix_fcfa)}</p>
                      {p.statut_moderation === 'rejete' && p.raison_rejet && (
                        <p className="mt-0.5 text-xs text-erreur">{p.raison_rejet}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.classe}`}>
                      {badge.label}
                    </span>
                  </Carte>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
