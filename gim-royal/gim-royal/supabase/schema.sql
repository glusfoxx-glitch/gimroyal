-- =============================================================================
-- GIM ROYAL — Schéma Supabase (SQL Editor > New query > coller > Run)
-- Authentification ultra-simple Pseudo / Mot de passe : le serveur de jeu hache les
-- mots de passe (scrypt) et accède à la table avec la clé service_role uniquement.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null,
  pseudo_lower text not null unique,
  password_hash text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  created_at timestamptz not null default now()
);

-- RLS activé SANS aucune policy : la clé publique (anon) ne peut rien lire ni écrire.
-- Seul le serveur (clé service_role, qui contourne RLS) accède aux comptes.
alter table public.players enable row level security;

-- Incrément atomique des statistiques en fin de match
create or replace function public.record_result(p_pseudo_lower text, p_outcome text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.players
     set wins   = wins   + case when p_outcome = 'win'  then 1 else 0 end,
         losses = losses + case when p_outcome = 'loss' then 1 else 0 end,
         draws  = draws  + case when p_outcome = 'draw' then 1 else 0 end
   where pseudo_lower = p_pseudo_lower;
$$;

revoke all on function public.record_result(text, text) from public, anon, authenticated;
grant execute on function public.record_result(text, text) to service_role;
