-- Cahiers de doléances : statistiques d'activité par compte (les points sont calculés côté serveur).
-- security_invoker : respecte la RLS (tokens masqués et commentaires cachés exclus).
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
                   where t.creator_wallet = p.wallet and tr.trader_wallet <> p.wallet), 0) as creator_volume_sol
    from public.profiles p;

grant select on public.cahiers_stats to anon, authenticated;
