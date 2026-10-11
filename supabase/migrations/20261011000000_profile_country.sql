-- Tiers-État — pays du trader (code ISO à 2 lettres, déduit de la connexion) pour la carte « Le monde qui trade »
alter table public.profiles add column if not exists country text check (country ~ '^[A-Z]{2}$');
