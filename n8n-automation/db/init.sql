-- ============================================================
-- Tables métier du pipeline marketing (créées au 1er démarrage).
-- Chaque agent écrit son résultat ici : historique + reprise sur erreur.
-- ============================================================

create table if not exists produits (
  id serial primary key,
  nom text not null,
  prix_fcfa integer,
  argument text,
  image_url text,
  whatsapp text,
  langues text default 'français',
  fiche jsonb,        -- sortie Agent 1 (analyse produit)
  contenu jsonb,      -- sortie Agent 2 (accroche, description, hashtags)
  statut text not null default 'recu',  -- recu / analyse / genere / publie / erreur
  cree_le timestamptz not null default now()
);

create table if not exists publications (
  id serial primary key,
  produit_id integer references produits (id) on delete cascade,
  reseau text not null default 'facebook',
  post_id_externe text,   -- id renvoyé par la Graph API
  legende text,
  publie_le timestamptz not null default now()
);
