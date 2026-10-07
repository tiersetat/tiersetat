# Tiers-État

> En 1789, c'est le peuple contre les privilégiés. Ici, la création monétaire rendue au peuple.

Launchpad de memecoins dédié aux mèmes français, sur **Solana devnet uniquement**.
Stack : Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Solana wallet-adapter · Meteora Dynamic Bonding Curve · Supabase · Pinata (IPFS).

⚠️ **DEVNET – argent fictif.** Aucun déploiement mainnet sans validation explicite du propriétaire du projet. Les textes légaux sont des placeholders **à faire valider par un avocat (MiCA / AMF)**.

## Installation

Prérequis : Node.js ≥ 20, npm, et l'extension [Phantom](https://phantom.com) ou [Solflare](https://solflare.com).

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
npm test                     # tests unitaires (vitest)
npm run test:devnet          # simulation d'un lancement complet sur le devnet (rien n'est écrit on-chain)
```

## Variables d'environnement

| Variable | Côté | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | public | RPC devnet (défaut : `https://api.devnet.solana.com`). Toute URL contenant « mainnet » est refusée. |
| `NEXT_PUBLIC_TREASURY_WALLET` | public | Adresse publique qui reçoit les partner fees Meteora. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Lecture publique Supabase (protégée par RLS). Clé `sb_publishable_…` ou ancienne `anon`. |
| `SUPABASE_SECRET_KEY` | **serveur** | Écritures vérifiées (clé `sb_secret_…` ou ancienne `service_role`). Jamais exposée au navigateur. |
| `SESSION_SECRET` | **serveur** | Signe le cookie de session. Générer avec `openssl rand -base64 32`. |
| `PINATA_JWT`, `PINATA_GATEWAY` | **serveur** | Upload des images et métadonnées sur IPFS. |

Aucune clé privée Solana n'est stockée dans le projet : toutes les transactions sont signées dans le wallet de l'utilisateur.

## Base de données (Supabase)

1. Créer un projet sur [supabase.com](https://supabase.com) (région Paris conseillée).
2. *SQL Editor* → *New query* → coller tout le contenu de `supabase/migrations/20261006000000_init.sql` → **Run**, puis faire de même avec `supabase/migrations/20261007000000_clans.sql`. Les scripts sont rejouables sans risque.
3. *Project Settings → API Keys* : recopier l'URL, la clé publishable et la clé secrète dans `.env.local`.
4. Se connecter une fois sur le site (wallet + « Signer pour entrer »), puis se donner le rôle admin dans *SQL Editor* :
   ```sql
   update public.profiles set role = 'admin' where wallet = 'TON_ADRESSE_WALLET';
   ```

**Sécurité** : le navigateur ne peut que *lire* les données publiques (RLS). Toutes les écritures passent par les routes API, après vérification d'une signature de wallet ou d'une transaction on-chain.

### Connexion « citoyen » (Sign-In With Solana)

1. `POST /api/auth/nonce` → nonce à usage unique (5 min) + message lisible.
2. Le wallet signe le message (gratuit, aucune transaction).
3. `POST /api/auth/verify` → le serveur reconstruit le message, vérifie la signature ed25519, consomme le nonce et pose un cookie `httpOnly` signé. Le rôle admin est toujours relu en base.

## Config Meteora DBC et frais de plateforme

Paramètres dans `src/lib/solana/curve.ts` (validés par le SDK officiel dans les tests) : 1 milliard de tokens, market cap de départ 2 SOL, migration vers DAMM v2 à 20 SOL de market cap (≈ 4,8 SOL levés), frais de trading 1 % encaissés en SOL (20 % protocole Meteora, puis 70 % créateur / 30 % plateforme), frais de création 0,02 SOL (anti-spam, 90 % plateforme), LP migrée 100 % verrouillée, métadonnées immuables.

1. Mettre l'adresse **publique** du wallet trésorerie dans `NEXT_PUBLIC_TREASURY_WALLET` (elle reçoit les partner fees).
2. Se connecter en admin, aller sur `/admin`, cliquer **Créer la config (devnet)** et signer (≈ 0,01 SOL de frais).
3. Copier l'adresse affichée dans `NEXT_PUBLIC_DBC_CONFIG`, redémarrer `npm run dev` : le panneau affiche « Config active ».

Quand les paramètres économiques changent, `/admin` propose de créer une nouvelle config : renseigner la nouvelle adresse dans `NEXT_PUBLIC_DBC_CONFIG` et l'ancienne dans `NEXT_PUBLIC_DBC_LEGACY_CONFIGS` (séparées par des virgules) pour que les anciens tokens restent échangeables et indexés. Aucune clé privée n'est stockée : la keypair de la config est éphémère et le wallet admin signe.

## Frapper un mème (IPFS + création en une transaction)

1. `POST /api/upload` (session requise) : validation, modération (mots bloqués + interdiction « officiel/vérifié »), vérification du vrai type d'image, upload image + JSON de métadonnées sur IPFS via Pinata. La clé Pinata reste côté serveur.
2. Le navigateur construit **une seule transaction** `createPoolWithFirstBuy` (token + pool DBC + achat initial optionnel), signée par le wallet du créateur. Les mints finissent par « FR ».
3. `POST /api/tokens` : le serveur relit tout **on-chain** (transaction réussie, pool sur notre config, créateur = wallet de la session, nom/ticker/URI depuis les métadonnées Metaplex, URI hébergée par notre gateway) avant d'indexer. Un contenu interdit est indexé masqué.

Pinata : créer une clé API avec la permission **Files → Write** (ou Admin), puis renseigner `PINATA_JWT` et `PINATA_GATEWAY`.

## Page token : achat / vente

- Devis exact via `swapQuote` du SDK Meteora (glissement max 1 %), transaction `swap` signée par le wallet.
- Avertissement de risque obligatoire (case à cocher) avant le premier achat, mémorisé dans le navigateur.
- `POST /api/trades` : n'importe qui peut soumettre une signature, le serveur relit la transaction on-chain (programme DBC, pool de notre config) et en déduit le trade (variation du compte du trader + du coffre SOL du pool). Idempotent.
- Graphique en bougies de market cap (lightweight-charts), registre et progression mis à jour en temps réel (Supabase Realtime).

## Ça buzz en France

`GET /api/buzz` agrège les flux RSS de franceinfo, Le Monde, 20 Minutes, Libération, Le Figaro, BFMTV et le flux Atom de r/france (l'API JSON de Reddit refuse les serveurs), avec un cache de 10 minutes. Une source en panne n'empêche pas l'affichage des autres. Les sujets graves (drames, victimes, guerres) sont écartés : pas de mème sur un drame. « Frapper ce mème » préremplit le formulaire (nom ≤ 32 octets, ticker suggéré, lien source) ; aucune image de presse n'est reprise.

## Modération et transparence

- **Signaler** (session requise, un signalement par compte et par token) : usurpation, haine, arnaque, illégal, autre. À partir de 5 signalements distincts en attente, le token est masqué automatiquement jusqu'à examen.
- **Admin** : signalements regroupés par token (Masquer / Rejeter), tokens masqués (Réafficher), mots bloqués (ajout / retrait, normalisés). Le rôle admin est relu en base à chaque action.
- **Transparence** sur chaque token, lue sur la blockchain (cache 1 min) : mint et gel révoqués, liquidité non retirable, ancienneté, part du créateur et ventes du créateur, concentration du top 10 (ou estimation depuis les échanges si le RPC refuse), liquidité de la courbe. Une donnée non vérifiée n'est jamais affichée en vert. Les points d'attention sont rappelés juste avant l'achat.

## Couche sociale

- `/profil/[wallet]` : pseudo (unique, insensible à la casse), avatar (IPFS), bio, tokens créés, trades récents, abonnés / abonnements. Lecture via la clé publishable côté serveur : les tokens masqués restent invisibles.
- `POST /api/profile` (session) : pseudo, bio et avatar modérés comme les tokens. `POST|DELETE /api/follow` (session) : suivre / ne plus suivre.
- `/abonnements` : lancements et trades des comptes suivis, initialisés depuis la vue `activity` puis mis à jour par Supabase Realtime (la RLS filtre les tokens masqués, y compris en temps réel).

## Obtenir du SOL devnet (gratuit, fictif)

1. Dans Phantom : Paramètres → Paramètres du développeur → activer le **mode Testnet** puis choisir **Solana Devnet**. (Solflare : Paramètres → Réseau → Devnet.)
2. Copier son adresse de wallet.
3. Aller sur [faucet.solana.com](https://faucet.solana.com), choisir **Devnet**, coller l'adresse, demander 1 à 5 SOL.
4. Alternative en ligne de commande : `solana airdrop 2 <ADRESSE> --url devnet`.

## Déployer sur Vercel

Avec la CLI (ce qui a servi pour https://tiersetat.vercel.app) :

```bash
npx vercel login                       # autorisation dans le navigateur
npx vercel link --project tiersetat    # crée / relie le projet
# Variables d'environnement de production (une par une, valeur lue sur l'entrée standard) :
printf '%s' "valeur" | npx vercel env add NOM_DE_LA_VARIABLE production --sensitive
npx vercel deploy --prod
```

- Node **24** est imposé (`engines` dans `package.json`) : le SDK Meteora en a besoin côté serveur.
- Région des fonctions : Dublin (`vercel.json`), au plus près de la base Supabase.
- `.vercelignore` exclut les secrets, les scripts et le SQL de l'envoi.
- Plan **Hobby** = usage non commercial uniquement : passer en **Pro** avant tout lancement réel.

Alternative : importer le dépôt GitHub sur [vercel.com/new](https://vercel.com/new) et recopier les variables de `.env.local` dans *Settings → Environment Variables*.

## Classements et clans

- `/classements` : créateurs (volume échangé sur leurs tokens), traders (volume) et clans de la semaine, remis à zéro le lundi à minuit (heure de Paris). On classe au **volume**, pas aux gains.
- `/clans` : 14 clans régionaux (13 régions + Outre-mer). Chaque compte rejoint un clan (`POST /api/clan`), avec un changement possible par semaine. Le classement des clans additionne le volume de leurs membres (vue `leaderboard_clans`).

## Portefeuille, euros, recherche, discussion, partage

- `/portefeuille` : soldes on-chain du wallet connecté × prix actuel des pools, gains/pertes d'après les trades indexés.
- Montants en euros partout (`GET /api/prix`, CoinGecko puis Kraken, cache 1 min) ; sur le devnet ils sont affichés comme « € fictifs ».
- `/recherche` (et barre dans l'en-tête) : nom, ticker, pseudo, ou adresse complète (redirection directe).
- Discussion sous chaque token (`POST|DELETE /api/comments`, modérée, 1 message / 10 s), auteur ou admin peut masquer.
- Partage sur X avec images Open Graph générées (`opengraph-image.tsx` de l'accueil et de chaque token).
- Créateurs : « Mes revenus de créateur » sur le profil et la page token (encaissement des frais créateur).

## Avant le lancement réel


## Feuille de route

- [x] 0. Squelette, bannière devnet, connexion wallet, pages légales
- [x] 1. Schéma Supabase + connexion par signature du wallet
- [x] 2. Config Meteora DBC (courbe + partner fees) depuis `/admin`
- [x] 3. Frapper un mème (IPFS + création token/pool en une transaction)
- [x] 4. Accueil : grille des tokens (onglets, stats on-chain rafraîchies, temps réel)
- [x] 5. Page token : graphique, achat/vente, historique
- [x] 6. Ça buzz en France (RSS + r/france)
- [x] 7. Modération (signalement, masquage admin, mots bloqués) + indicateurs de transparence
- [x] 8. Profils, abonnements, fil temps réel
- [x] 9. Classements de la semaine, clans régionaux, finitions (en-têtes de sécurité, 404, checklist de lancement)
