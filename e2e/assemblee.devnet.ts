import fs from "node:fs";
import BN from "bn.js";
import { expect, it } from "vitest";
import { Connection, Keypair, PublicKey, Transaction, type TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import {
  GovernanceConfig,
  MintMaxVoteWeightSource,
  SetRealmAuthorityAction,
  Vote,
  VoteChoice,
  VoteKind,
  VoteThreshold,
  VoteThresholdType,
  VoteTipping,
  VoteType,
  getGovernanceProgramVersion,
  getProposal,
  getRealm,
  withCastVote,
  withCreateGovernance,
  withCreateNativeTreasury,
  withCreateProposal,
  withCreateRealm,
  withDepositGoverningTokens,
  withSetRealmAuthority,
  withSignOffProposal,
} from "@solana/spl-governance";

/**
 * L'Assemblée de Tiers-État, en répétition sur le devnet (SPL Governance, l'outil standard de Solana).
 *   RUN_ASSEMBLEE=1 COFFRE_PAYER=… ASSEMBLEE_OUT=…/assemblee.json npm run test:devnet -- assemblee
 */
const GOVERNANCE_PROGRAM = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
const DECIMALS = 6;
// Le SDK de gouvernance embarque sa propre version des types BN : on convertit à la frontière
const units = (n: number) => new BN(n).mul(new BN(10).pow(new BN(DECIMALS))) as unknown as never;
const raw = (n: number) => BigInt(n) * BigInt(10) ** BigInt(DECIMALS);

it.skipIf(process.env.RUN_ASSEMBLEE !== "1")("crée l'Assemblée, son trésor, une proposition et un vote", { timeout: 10 * 60_000 }, async () => {
  const connection = new Connection(process.env.SOLANA_RPC_URL as string, "confirmed");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.COFFRE_PAYER as string, "utf8"))));
  const founder = new PublicKey(process.env.NEXT_PUBLIC_FOUNDER_WALLET as string);
  const send = (ixs: TransactionInstruction[]) => sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [payer], { commitment: "confirmed" });
  const version = await getGovernanceProgramVersion(connection, GOVERNANCE_PROGRAM);

  // 1. Token de vote de test (représente le futur $TIERS) : 10 M pour le test, 1 M pour le fondateur
  const mint = await createMint(connection, payer, payer.publicKey, null, DECIMALS);
  const payerAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const founderAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, founder);
  await mintTo(connection, payer, mint, payerAta.address, payer, raw(10_000_000));
  await mintTo(connection, payer, mint, founderAta.address, payer, raw(1_000_000));

  // 2. L'Assemblée (realm) + dépôt des voix du compte de test
  const ixs1: TransactionInstruction[] = [];
  const realm = await withCreateRealm(ixs1, GOVERNANCE_PROGRAM, version, `Assemblée Tiers-État ${mint.toBase58().slice(0, 4)}`, payer.publicKey, mint, payer.publicKey, undefined, MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION, units(100_000));
  const tor = await withDepositGoverningTokens(ixs1, GOVERNANCE_PROGRAM, version, realm, payerAta.address, mint, payer.publicKey, payer.publicKey, payer.publicKey, units(5_000_000));
  await send(ixs1);

  // 3. Les règles de vote : majorité de 50 % des voix, 2 jours de vote, pas de conseil (le peuple seul décide)
  const config = new GovernanceConfig({
    communityVoteThreshold: new VoteThreshold({ type: VoteThresholdType.YesVotePercentage, value: 50 }),
    minCommunityTokensToCreateProposal: units(100_000),
    minInstructionHoldUpTime: 0,
    baseVotingTime: 2 * 24 * 3600,
    communityVoteTipping: VoteTipping.Early,
    minCouncilTokensToCreateProposal: new BN("18446744073709551615") as unknown as never,
    councilVoteThreshold: new VoteThreshold({ type: VoteThresholdType.Disabled }),
    councilVetoVoteThreshold: new VoteThreshold({ type: VoteThresholdType.Disabled }),
    communityVetoVoteThreshold: new VoteThreshold({ type: VoteThresholdType.Disabled }),
    councilVoteTipping: VoteTipping.Disabled,
    votingCoolOffTime: 0,
    depositExemptProposalCount: 10,
  });
  const ixs2: TransactionInstruction[] = [];
  const governance = await withCreateGovernance(ixs2, GOVERNANCE_PROGRAM, version, realm, undefined, config, tor, payer.publicKey, payer.publicKey);
  const treasury = await withCreateNativeTreasury(ixs2, GOVERNANCE_PROGRAM, version, governance, payer.publicKey);
  // Plus personne ne contrôle l'Assemblée à part ses propres votes
  withSetRealmAuthority(ixs2, GOVERNANCE_PROGRAM, version, realm, payer.publicKey, governance, SetRealmAuthorityAction.SetChecked);
  await send(ixs2);

  // 4. Première proposition, publiée puis votée
  const ixs3: TransactionInstruction[] = [];
  const proposal = await withCreateProposal(
    ixs3, GOVERNANCE_PROGRAM, version, realm, governance, tor,
    "Proposition n°1 : adopter le Manifeste comme texte fondateur",
    "https://tiersetat.vercel.app/manifeste",
    mint, payer.publicKey, 0, VoteType.SINGLE_CHOICE, ["Adopter le Manifeste"], true, payer.publicKey,
  );
  withSignOffProposal(ixs3, GOVERNANCE_PROGRAM, version, realm, governance, proposal, payer.publicKey, undefined, tor);
  await send(ixs3);
  const ixs4: TransactionInstruction[] = [];
  await withCastVote(
    ixs4, GOVERNANCE_PROGRAM, version, realm, governance, proposal, tor, tor, payer.publicKey, mint,
    new Vote({ voteType: VoteKind.Approve, approveChoices: [new VoteChoice({ rank: 0, weightPercentage: 100 })], deny: undefined, veto: undefined }),
    payer.publicKey,
  );
  await send(ixs4);

  const r = await getRealm(connection, realm);
  const p = await getProposal(connection, proposal);
  expect(r.account.authority?.equals(governance)).toBe(true);
  console.log("ASSEMBLEE", JSON.stringify({ realm: realm.toBase58(), governance: governance.toBase58(), treasury: treasury.toBase58(), mint: mint.toBase58(), proposal: proposal.toBase58(), state: p.account.state, version }));
  fs.writeFileSync(process.env.ASSEMBLEE_OUT as string, JSON.stringify({ realm: realm.toBase58(), governance: governance.toBase58(), treasury: treasury.toBase58(), mint: mint.toBase58(), proposal: proposal.toBase58() }, null, 2));
});
