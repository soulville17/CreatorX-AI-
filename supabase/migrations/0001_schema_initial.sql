-- ============================================================
-- CreatorX AI — Migration initiale
-- Tables, RLS, fonction atomique debit_credits, seed des packs.
-- ============================================================

-- ---------- PROFILS ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null default '',
  numero_whatsapp text not null default '', -- format international, ex. +2250701020304
  ville text not null default '',
  type_activite text not null default 'autre'
    check (type_activite in ('mode','cosmetiques','alimentation','restaurant','beaute','sante','auto','immobilier','formation','services','autre')),
  credits_solde integer not null default 0 check (credits_solde >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- PRODUITS ----------
create table public.produits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nom text not null,
  description text not null default '',
  prix_fcfa integer not null check (prix_fcfa > 0),
  photos text[] not null default '{}', -- URLs Supabase Storage
  statut_moderation text not null default 'en_attente'
    check (statut_moderation in ('en_attente','approuve','rejete')),
  raison_rejet text,
  analyse_marketing jsonb, -- sortie de l'Agent Marketing
  created_at timestamptz not null default now()
);
create index produits_user_idx on public.produits (user_id, created_at desc);

-- ---------- GÉNÉRATIONS (tout contenu créé par un agent) ----------
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  produit_id uuid references public.produits (id) on delete cascade,
  agent text not null
    check (agent in ('marketing','copywriter','visuel','video','voix','reseaux_sociaux','publicite','analyse','optimisation')),
  type text not null check (type in ('texte','visuel','video','voix','declinaison')),
  prompt_utilise text,
  resultat_url text,
  resultat_texte text,
  credits_consommes integer not null default 0,
  cout_api_estime_fcfa numeric(10,2) not null default 0, -- suivi de rentabilité
  statut text not null default 'termine'
    check (statut in ('en_attente','en_cours','termine','echec')),
  metadonnees jsonb, -- ex. compteur de régénérations vidéo, plateformes déclinées
  created_at timestamptz not null default now()
);
create index generations_user_idx on public.generations (user_id, created_at desc);
create index generations_produit_idx on public.generations (produit_id, created_at desc);
create index generations_cout_idx on public.generations (created_at, agent);

-- ---------- CAMPAGNES ----------
create table public.campagnes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  produit_id uuid not null references public.produits (id) on delete cascade,
  objectif text not null default 'messages_whatsapp' check (objectif in ('messages_whatsapp')),
  ciblage_villes text[] not null default '{}',
  ciblage_genre text not null default 'tous' check (ciblage_genre in ('tous','femmes','hommes')),
  ciblage_age_min integer not null default 18 check (ciblage_age_min >= 13),
  ciblage_age_max integer not null default 55 check (ciblage_age_max <= 65),
  ciblage_interets text[] not null default '{}',
  budget_client_fcfa integer not null check (budget_client_fcfa >= 10000),
  budget_meta_fcfa integer not null, -- = 65% du budget client
  duree_jours integer not null default 7 check (duree_jours between 1 and 30),
  statut text not null default 'brouillon'
    check (statut in ('brouillon','payee','en_cours','terminee','rejetee')),
  brief_genere jsonb,                 -- brief structuré de l'Agent Publicité
  stats_quotidiennes jsonb,           -- tableau de stats saisies par l'admin + résumés Agent Analyse
  recommandations_optimisation jsonb, -- sortie de l'Agent Optimisation
  created_at timestamptz not null default now()
);
create index campagnes_user_idx on public.campagnes (user_id, created_at desc);
create index campagnes_statut_idx on public.campagnes (statut, created_at desc);

-- ---------- PAIEMENTS ----------
create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('credits','campagne')),
  montant_fcfa integer not null check (montant_fcfa > 0),
  reference_cinetpay text not null unique, -- l'unicité garantit l'idempotence du webhook
  statut text not null default 'initie' check (statut in ('initie','confirme','echoue')),
  campagne_id uuid references public.campagnes (id) on delete set null,
  pack_credits uuid, -- référence packs_credits si type = credits
  created_at timestamptz not null default now()
);
create index paiements_user_idx on public.paiements (user_id, created_at desc);

-- ---------- PACKS DE CRÉDITS ----------
create table public.packs_credits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prix_fcfa integer not null,
  credits integer not null,
  description text not null default ''
);

-- Seed des 3 packs
insert into public.packs_credits (nom, prix_fcfa, credits, description) values
  ('Découverte', 2000, 15, 'Pour essayer : quelques textes et visuels pour ta première pub.'),
  ('Vendeuse', 5000, 45, 'Le pack idéal pour créer tes pubs chaque semaine, vidéos incluses.'),
  ('Pro PME', 15000, 150, 'Pour les boutiques actives : contenus illimités toute la semaine et campagnes régulières.');

-- ============================================================
-- FONCTIONS
-- ============================================================

-- L'utilisateur est-il admin ? (security definer pour éviter la récursion RLS)
create or replace function public.est_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Débit ATOMIQUE de crédits : échoue si le solde est insuffisant.
-- Appelée uniquement par les Edge Functions (service_role).
create or replace function public.debit_credits(p_user_id uuid, p_montant integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  nouveau_solde integer;
begin
  if p_montant <= 0 then
    raise exception 'Montant de débit invalide';
  end if;

  update public.profiles
     set credits_solde = credits_solde - p_montant
   where id = p_user_id
     and credits_solde >= p_montant
  returning credits_solde into nouveau_solde;

  if nouveau_solde is null then
    raise exception 'SOLDE_INSUFFISANT';
  end if;

  return nouveau_solde;
end;
$$;

-- Crédit de crédits (achat de pack confirmé, bonus de bienvenue, remboursement d'échec)
create or replace function public.credit_credits(p_user_id uuid, p_montant integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  nouveau_solde integer;
begin
  update public.profiles
     set credits_solde = credits_solde + p_montant
   where id = p_user_id
  returning credits_solde into nouveau_solde;
  return nouveau_solde;
end;
$$;

-- Création automatique du profil à l'inscription + bonus de bienvenue (5 crédits)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, credits_solde) values (new.id, 5);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS — chaque utilisateur ne voit que ses données, l'admin voit tout
-- ============================================================

alter table public.profiles enable row level security;
alter table public.produits enable row level security;
alter table public.generations enable row level security;
alter table public.campagnes enable row level security;
alter table public.paiements enable row level security;
alter table public.packs_credits enable row level security;

-- PROFILES : lecture/mise à jour de son propre profil (jamais du solde ni du rôle côté client)
create policy "profil: lire le sien ou admin" on public.profiles
  for select using (id = auth.uid() or public.est_admin());
create policy "profil: modifier le sien" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
-- NB : credits_solde et is_admin ne sont modifiés que par les fonctions security definer
-- et le service_role ; une colonne protégée par trigger ci-dessous.

create or replace function public.protege_colonnes_profil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Empêche un client de modifier son solde ou son rôle via l'API REST
  if current_setting('request.jwt.claim.role', true) = 'authenticated' then
    new.credits_solde := old.credits_solde;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger profiles_protege_colonnes
  before update on public.profiles
  for each row execute function public.protege_colonnes_profil();

-- PRODUITS
create policy "produits: lire les siens ou admin" on public.produits
  for select using (user_id = auth.uid() or public.est_admin());
create policy "produits: creer les siens" on public.produits
  for insert with check (user_id = auth.uid());
create policy "produits: modifier les siens" on public.produits
  for update using (user_id = auth.uid() or public.est_admin());
create policy "produits: supprimer les siens" on public.produits
  for delete using (user_id = auth.uid());

-- GENERATIONS (créées par les Edge Functions ; le client lit seulement)
create policy "generations: lire les siennes ou admin" on public.generations
  for select using (user_id = auth.uid() or public.est_admin());

-- CAMPAGNES
create policy "campagnes: lire les siennes ou admin" on public.campagnes
  for select using (user_id = auth.uid() or public.est_admin());
create policy "campagnes: creer les siennes" on public.campagnes
  for insert with check (user_id = auth.uid());
create policy "campagnes: brouillon modifiable" on public.campagnes
  for update using ((user_id = auth.uid() and statut = 'brouillon') or public.est_admin());

-- PAIEMENTS (créés par les Edge Functions ; lecture seule côté client)
create policy "paiements: lire les siens ou admin" on public.paiements
  for select using (user_id = auth.uid() or public.est_admin());

-- PACKS : lisibles par tous les connectés
create policy "packs: lecture publique" on public.packs_credits
  for select using (true);

-- ============================================================
-- STORAGE — bucket des photos produits et des contenus générés
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('produits', 'produits', true),
  ('generations', 'generations', true);

create policy "storage produits: upload dans son dossier" on storage.objects
  for insert with check (
    bucket_id = 'produits'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage produits: lecture publique" on storage.objects
  for select using (bucket_id in ('produits', 'generations'));
