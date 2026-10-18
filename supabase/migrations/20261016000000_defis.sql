-- Tiers-État — Défis des communautés : le créateur d'un mème lance un défi (vidéo, photo, mème…),
-- validé par un administrateur avant publication. Récompenses symboliques uniquement (aucun argent ne transite).
create table if not exists public.defis (
  id               bigint generated always as identity primary key,
  mint             text not null references public.tokens (mint) on delete cascade,
  creator_wallet   text not null references public.profiles (wallet),
  title            text not null check (char_length(title) between 5 and 80),
  rules            text not null check (char_length(rules) between 10 and 500),
  ends_at          timestamptz not null,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  reject_reason    text,
  winner_entry_id  bigint,
  created_at       timestamptz not null default now()
);
create index if not exists defis_mint_idx on public.defis (mint, created_at desc);
create index if not exists defis_pending_idx on public.defis (created_at) where status = 'pending';

create table if not exists public.defi_entries (
  id            bigint generated always as identity primary key,
  defi_id       bigint not null references public.defis (id) on delete cascade,
  author_wallet text not null references public.profiles (wallet),
  url           text not null check (char_length(url) <= 300),
  note          text check (note is null or char_length(note) <= 200),
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (defi_id, author_wallet)
);
create index if not exists defi_entries_defi_idx on public.defi_entries (defi_id, created_at desc);

-- Lecture publique : seulement les défis validés et leurs participations visibles. Écriture : uniquement par le serveur.
alter table public.defis enable row level security;
alter table public.defi_entries enable row level security;
grant select on public.defis, public.defi_entries to anon, authenticated;
drop policy if exists "defis publics" on public.defis;
create policy "defis publics" on public.defis for select using (status in ('approved', 'closed'));
drop policy if exists "participations publiques" on public.defi_entries;
create policy "participations publiques" on public.defi_entries for select using (
  not hidden and exists (select 1 from public.defis d where d.id = defi_id and d.status in ('approved', 'closed'))
);
