-- =====================================================================
-- Tiers-État — schéma initial (à coller UNE fois dans Supabase > SQL Editor)
--
-- Principe de sécurité :
--   * Lecture publique (clé publishable) filtrée par RLS.
--   * AUCUNE écriture possible depuis le navigateur : toutes les écritures
--     passent par les routes API Next.js (clé secrète, côté serveur),
--     après vérification de la signature du wallet ou de la transaction.
-- =====================================================================

create extension if not exists citext;

-- Adresse Solana en base58 (32 à 44 caractères)
create or replace function public.is_solana_address(v text)
returns boolean language sql immutable as $$
  select v ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
$$;

-- ---------------------------------------------------------------------
-- Profils (un profil = un wallet)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  wallet      text primary key check (public.is_solana_address(wallet)),
  pseudo      citext unique check (pseudo is null or pseudo ~ '^[[:alnum:]_.-]{3,24}$'),
  avatar_url  text check (avatar_url is null or avatar_url ~ '^https://'),
  bio         text check (bio is null or char_length(bio) <= 280),
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Nonces de connexion (Sign-In With Solana) — serveur uniquement
-- ---------------------------------------------------------------------
create table if not exists public.auth_nonces (
  nonce       text primary key,
  wallet      text not null check (public.is_solana_address(wallet)),
  domain      text not null,
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists auth_nonces_expires_idx on public.auth_nonces (expires_at);

-- ---------------------------------------------------------------------
-- Tokens (index des mèmes lancés via Meteora DBC)
-- ---------------------------------------------------------------------
create table if not exists public.tokens (
  mint              text primary key check (public.is_solana_address(mint)),
  pool              text not null unique check (public.is_solana_address(pool)),
  config            text not null check (public.is_solana_address(config)),
  creator_wallet    text not null references public.profiles (wallet),
  name              text not null check (char_length(name) between 1 and 32),
  ticker            text not null check (ticker ~ '^[A-Z0-9]{2,10}$'),
  description       text check (description is null or char_length(description) <= 500),
  image_url         text not null,
  metadata_uri      text not null,
  twitter_url       text,
  website_url       text,
  source_url        text,               -- actu « Ça buzz » d'origine, si applicable
  launch_signature  text not null unique,
  market_cap_sol    numeric(30, 9) not null default 0,
  curve_progress    numeric(5, 2) not null default 0 check (curve_progress between 0 and 100),
  migrated          boolean not null default false,
  last_trade_at     timestamptz,
  -- modération
  hidden            boolean not null default false,
  hidden_reason     text,
  hidden_by         text references public.profiles (wallet),
  hidden_at         timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists tokens_created_idx  on public.tokens (created_at desc) where not hidden;
create index if not exists tokens_progress_idx on public.tokens (curve_progress desc) where not hidden;
create index if not exists tokens_creator_idx  on public.tokens (creator_wallet);

-- ---------------------------------------------------------------------
-- Trades (indexés après vérification on-chain de la transaction)
-- ---------------------------------------------------------------------
create table if not exists public.trades (
  signature      text primary key,
  mint           text not null references public.tokens (mint) on delete cascade,
  trader_wallet  text not null references public.profiles (wallet),
  side           text not null check (side in ('buy', 'sell')),
  sol_amount     numeric(30, 9) not null check (sol_amount > 0),
  token_amount   numeric(40, 9) not null check (token_amount > 0),
  price_sol      numeric(40, 18) not null check (price_sol > 0),
  block_time     timestamptz not null,
  created_at     timestamptz not null default now()
);
create index if not exists trades_mint_time_idx   on public.trades (mint, block_time desc);
create index if not exists trades_trader_time_idx on public.trades (trader_wallet, block_time desc);
create index if not exists trades_time_idx        on public.trades (block_time desc);

-- ---------------------------------------------------------------------
-- Social : abonnements
-- ---------------------------------------------------------------------
create table if not exists public.follows (
  follower_wallet  text not null references public.profiles (wallet) on delete cascade,
  followee_wallet  text not null references public.profiles (wallet) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (follower_wallet, followee_wallet),
  check (follower_wallet <> followee_wallet)
);
create index if not exists follows_followee_idx on public.follows (followee_wallet);

-- ---------------------------------------------------------------------
-- Modération
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id               bigint generated always as identity primary key,
  mint             text not null references public.tokens (mint) on delete cascade,
  reporter_wallet  text not null references public.profiles (wallet),
  reason           text not null check (reason in ('usurpation', 'haine', 'arnaque', 'illegal', 'autre')),
  details          text check (details is null or char_length(details) <= 500),
  status           text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      text references public.profiles (wallet),
  unique (mint, reporter_wallet)
);
create index if not exists reports_open_idx on public.reports (created_at desc) where status = 'open';

-- Mots bloqués, stockés sous forme normalisée (minuscules, sans accents)
create table if not exists public.blocked_words (
  word        text primary key check (word = lower(word) and char_length(word) >= 2),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRÉVU POUR PLUS TARD (pas d'UI dans le MVP) : commentaires et likes
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id             bigint generated always as identity primary key,
  mint           text not null references public.tokens (mint) on delete cascade,
  author_wallet  text not null references public.profiles (wallet) on delete cascade,
  parent_id      bigint references public.comments (id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 1000),
  hidden         boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists comments_mint_idx on public.comments (mint, created_at desc);

create table if not exists public.token_likes (
  mint        text not null references public.tokens (mint) on delete cascade,
  wallet      text not null references public.profiles (wallet) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (mint, wallet)
);

create table if not exists public.comment_likes (
  comment_id  bigint not null references public.comments (id) on delete cascade,
  wallet      text not null references public.profiles (wallet) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, wallet)
);

-- ---------------------------------------------------------------------
-- Vues (security_invoker : elles respectent la RLS de l'appelant)
-- ---------------------------------------------------------------------

-- Fil d'activité : lancements + trades
create or replace view public.activity with (security_invoker = true) as
  select 'launch'::text as kind, t.creator_wallet as actor_wallet, t.mint,
         t.name, t.ticker, t.image_url, null::text as side,
         null::numeric as sol_amount, t.launch_signature as signature,
         t.created_at as at
  from public.tokens t
  union all
  select 'trade', tr.trader_wallet, tr.mint, t.name, t.ticker, t.image_url,
         tr.side, tr.sol_amount, tr.signature, tr.block_time
  from public.trades tr
  join public.tokens t on t.mint = tr.mint;

-- Début de la semaine en cours (lundi 00:00, heure de Paris)
create or replace function public.week_start()
returns timestamptz language sql stable as $$
  select date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
$$;

-- Classement des créateurs : volume échangé cette semaine sur leurs tokens
create or replace view public.leaderboard_creators with (security_invoker = true) as
  select t.creator_wallet as wallet,
         count(distinct t.mint) filter (where t.created_at >= public.week_start()) as tokens_launched,
         coalesce(sum(tr.sol_amount) filter (where tr.block_time >= public.week_start()), 0) as volume_sol,
         count(tr.signature) filter (where tr.block_time >= public.week_start()) as trades_count
  from public.tokens t
  left join public.trades tr on tr.mint = t.mint
  group by t.creator_wallet;

-- Classement des traders : flux net de SOL cette semaine (ventes − achats)
create or replace view public.leaderboard_traders with (security_invoker = true) as
  select tr.trader_wallet as wallet,
         count(*) as trades_count,
         sum(tr.sol_amount) as volume_sol,
         sum(case when tr.side = 'sell' then tr.sol_amount else -tr.sol_amount end) as net_sol
  from public.trades tr
  where tr.block_time >= public.week_start()
  group by tr.trader_wallet;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.auth_nonces   enable row level security;
alter table public.tokens        enable row level security;
alter table public.trades        enable row level security;
alter table public.follows       enable row level security;
alter table public.reports       enable row level security;
alter table public.blocked_words enable row level security;
alter table public.comments      enable row level security;
alter table public.token_likes   enable row level security;
alter table public.comment_likes enable row level security;

-- Le navigateur ne peut QUE lire (et seulement ce qui est public).
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.tokens, public.trades, public.follows,
               public.comments, public.token_likes, public.comment_likes,
               public.activity, public.leaderboard_creators, public.leaderboard_traders
  to anon, authenticated;
revoke all on public.auth_nonces, public.reports, public.blocked_words from anon, authenticated;

drop policy if exists "profils publics" on public.profiles;
create policy "profils publics" on public.profiles for select using (true);

drop policy if exists "tokens visibles" on public.tokens;
create policy "tokens visibles" on public.tokens for select using (not hidden);

drop policy if exists "trades des tokens visibles" on public.trades;
create policy "trades des tokens visibles" on public.trades for select
  using (exists (select 1 from public.tokens t where t.mint = trades.mint and not t.hidden));

drop policy if exists "abonnements publics" on public.follows;
create policy "abonnements publics" on public.follows for select using (true);

drop policy if exists "commentaires visibles" on public.comments;
create policy "commentaires visibles" on public.comments for select
  using (not hidden and exists (select 1 from public.tokens t where t.mint = comments.mint and not t.hidden));

drop policy if exists "likes publics" on public.token_likes;
create policy "likes publics" on public.token_likes for select using (true);

drop policy if exists "likes commentaires publics" on public.comment_likes;
create policy "likes commentaires publics" on public.comment_likes for select using (true);
-- auth_nonces, reports, blocked_words : aucune policy => inaccessibles hors serveur.

-- ---------------------------------------------------------------------
-- Temps réel (fil « Mes abonnements », graphique, historique)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tokens', 'trades'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Mots bloqués de départ (forme normalisée). Complétable depuis l'admin.
-- ---------------------------------------------------------------------
insert into public.blocked_words (word) values
  ('bougnoule'), ('bicot'), ('youpin'), ('youtre'), ('negre'), ('negro'),
  ('chintok'), ('bamboula'), ('tarlouze'), ('pede'), ('gouine'),
  ('sale juif'), ('sale arabe'), ('sale noir'), ('sale blanc'), ('sale noire'),
  ('heil hitler'), ('sieg heil'), ('white power'), ('kkk'), ('1488'),
  ('mort aux juifs'), ('mort aux arabes'), ('gazer les')
on conflict (word) do nothing;
