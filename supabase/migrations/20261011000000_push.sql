-- Notifications sur téléphone (Web Push) : un abonnement par appareil.
-- Aucune lecture publique : seules les routes serveur (clé secrète) y accèdent.
create table if not exists public.push_subscriptions (
  endpoint    text primary key check (endpoint ~ '^https://'),
  wallet      text not null references public.profiles (wallet) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_wallet_idx on public.push_subscriptions (wallet);
alter table public.push_subscriptions enable row level security;
