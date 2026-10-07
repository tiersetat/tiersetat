-- Invitations : code personnel, parrain de chaque compte, et invités actifs dans les Cahiers.
alter table public.profiles add column if not exists invite_code text unique
  check (invite_code is null or invite_code ~ '^[A-Z2-9]{6}$');
alter table public.profiles add column if not exists referred_by text
  references public.profiles (wallet) on delete set null
  check (referred_by is null or referred_by <> wallet);

-- Un invité « actif » a créé au moins un token ou fait au moins un échange.
create or replace view public.cahiers_stats with (security_invoker = true) as
  select p.wallet,
         (select count(*) from public.tokens t where t.creator_wallet = p.wallet) as tokens_created,
         coalesce((select sum(tr.sol_amount) from public.trades tr where tr.trader_wallet = p.wallet), 0) as volume_sol,
         (select count(distinct tr.mint) from public.trades tr where tr.trader_wallet = p.wallet) as tokens_traded,
         (select count(*) from public.comments c where c.author_wallet = p.wallet) as comments,
         (select count(*) from public.follows f where f.followee_wallet = p.wallet) as followers,
         (p.clan is not null) as has_clan,
         coalesce((select sum(tr.sol_amount) from public.trades tr
                    join public.tokens t on t.mint = tr.mint
                   where t.creator_wallet = p.wallet and tr.trader_wallet <> p.wallet), 0) as creator_volume_sol,
         (select count(*) from public.profiles f
           where f.referred_by = p.wallet
             and (exists (select 1 from public.trades tr where tr.trader_wallet = f.wallet)
               or exists (select 1 from public.tokens t where t.creator_wallet = f.wallet))) as active_referrals
    from public.profiles p;
