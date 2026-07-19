-- ============================================================
-- CreatorX AI — Migration 0002
-- 1. Le fondateur devient automatiquement admin à l'inscription.
-- 2. Verrouillage des fonctions de solde (appelables uniquement
--    par le serveur / service_role, jamais par les clients).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, credits_solde, is_admin)
  values (
    new.id,
    5, -- bonus de bienvenue
    lower(coalesce(new.email, '')) = 'soulville63@gmail.com' -- email du fondateur
  );
  return new;
end;
$$;

revoke execute on function public.debit_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function public.credit_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protege_colonnes_profil() from public, anon, authenticated;
