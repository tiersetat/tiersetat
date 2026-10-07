-- =====================================================================
-- Tiers-État — clans régionaux + classement des clans
-- À coller dans Supabase > SQL Editor puis « Run » (rejouable sans risque).
-- =====================================================================

create table if not exists public.clans (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  hue         smallint not null check (hue between 0 and 359),  -- couleur de l'emblème
  sort_order  smallint not null default 0
);

insert into public.clans (slug, name, hue, sort_order) values
  ('ile-de-france',               'Île-de-France',               232, 1),
  ('auvergne-rhone-alpes',        'Auvergne-Rhône-Alpes',        200, 2),
  ('provence-alpes-cote-d-azur',  'Provence-Alpes-Côte d''Azur', 195, 3),
  ('occitanie',                   'Occitanie',                     0, 4),
  ('nouvelle-aquitaine',          'Nouvelle-Aquitaine',           20, 5),
  ('bretagne',                    'Bretagne',                    220, 6),
  ('normandie',                   'Normandie',                    45, 7),
  ('hauts-de-france',             'Hauts-de-France',             260, 8),
  ('grand-est',                   'Grand Est',                   280, 9),
  ('bourgogne-franche-comte',     'Bourgogne-Franche-Comté',     330, 10),
  ('centre-val-de-loire',         'Centre-Val de Loire',         150, 11),
  ('pays-de-la-loire',            'Pays de la Loire',            170, 12),
  ('corse',                       'Corse',                       120, 13),
  ('outre-mer',                   'Outre-mer',                   180, 14)
on conflict (slug) do update set name = excluded.name, hue = excluded.hue, sort_order = excluded.sort_order;

alter table public.profiles add column if not exists clan text references public.clans (slug) on delete set null;
alter table public.profiles add column if not exists clan_joined_at timestamptz;
create index if not exists profiles_clan_idx on public.profiles (clan) where clan is not null;

alter table public.clans enable row level security;
grant select on public.clans to anon, authenticated;
drop policy if exists "clans publics" on public.clans;
create policy "clans publics" on public.clans for select using (true);

-- Classement des clans de la semaine : volume échangé par leurs membres, tokens lancés, membres
create or replace view public.leaderboard_clans with (security_invoker = true) as
  select c.slug, c.name, c.hue,
         (select count(*) from public.profiles p where p.clan = c.slug) as members,
         coalesce((select sum(tr.sol_amount) from public.trades tr
                   join public.profiles p on p.wallet = tr.trader_wallet
                   where p.clan = c.slug and tr.block_time >= public.week_start()), 0) as volume_sol,
         (select count(*) from public.tokens t
                   join public.profiles p on p.wallet = t.creator_wallet
                   where p.clan = c.slug and t.created_at >= public.week_start()) as tokens_launched
  from public.clans c;

grant select on public.leaderboard_clans to anon, authenticated;
