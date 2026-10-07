-- Liste d'attente du lancement : e-mail seul, consentement explicite.
-- Aucune lecture publique des e-mails : seul le nombre d'inscrits est exposé (fonction ci-dessous).
create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text not null,
  source      text,
  consent_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint waitlist_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254)
);
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
-- Pas de policy : seules les routes serveur (clé secrète) lisent et écrivent.

create or replace function public.waitlist_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$ select count(*) from public.waitlist $$;

grant execute on function public.waitlist_count() to anon, authenticated;
