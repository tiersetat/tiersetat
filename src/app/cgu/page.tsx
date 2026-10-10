import type { Metadata } from "next";
import Link from "next/link";
import { LegalNotice } from "@/components/layout/LegalNotice";
import { SANCTIONED_COUNTRIES } from "@/lib/geo";

export const metadata: Metadata = { title: "Conditions d'utilisation — Tiers-État" };

const PAYS = new Intl.DisplayNames(["fr"], { type: "region" });
const paysSanctionnes = SANCTIONED_COUNTRIES.map((c) => PAYS.of(c) ?? c).join(", ");

/** Champ à compléter une fois la société constituée. */
function Todo({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-soleil/15 px-1 text-amber-200">{children}</mark>;
}

const SECTIONS: { titre: string; contenu: React.ReactNode }[] = [
  {
    titre: "Qui exploite Tiers-État",
    contenu: (
      <p>
        Tiers-État (le « Service ») est exploité par <Todo>[dénomination de la société], société constituée aux Bahamas, immatriculée sous le
        numéro [numéro], dont le siège est situé [adresse]</Todo> (« nous »). Jusqu&apos;à sa constitution, le Service est édité en version bêta
        par son fondateur.
      </p>
    ),
  },
  {
    titre: "Acceptation et conditions d'accès",
    contenu: (
      <>
        <p>En utilisant le Service, tu acceptes les présentes conditions. Tu déclares :</p>
        <ul>
          <li>avoir au moins 18 ans et la capacité juridique de conclure un contrat ;</li>
          <li>
            ne pas résider, ni être situé, dans un pays ou une région soumis à des sanctions internationales, notamment : {paysSanctionnes},
            ainsi que la Crimée, Sébastopol et les régions de Donetsk et de Louhansk, ni dans tout autre pays où nous restreignons l&apos;accès ;
          </li>
          <li>ne figurer sur aucune liste de sanctions (ONU, Union européenne, États-Unis, Royaume-Uni) ;</li>
          <li>ne pas contourner ces restrictions, par exemple au moyen d&apos;un VPN.</li>
        </ul>
        <p>Il t&apos;appartient de vérifier que l&apos;utilisation du Service est légale dans ton pays.</p>
      </>
    ),
  },
  {
    titre: "Ce qu'est le Service, et ce qu'il n'est pas",
    contenu: (
      <>
        <p>
          Le Service est une interface logicielle qui permet de créer et d&apos;échanger des jetons sur la blockchain Solana, au moyen de
          programmes publics opérés par des tiers (notamment les protocoles de Meteora). Chaque opération est une transaction que tu signes
          toi-même et qui s&apos;exécute directement sur la blockchain.
        </p>
        <p>
          Nous ne détenons jamais tes fonds ni tes jetons, nous n&apos;exécutons pas d&apos;ordres pour ton compte et nous ne pouvons ni annuler ni
          modifier une transaction. Nous ne sommes ni une plateforme de négociation, ni un courtier, ni un conseiller en investissement.{" "}
          <Todo>[Statut réglementaire à préciser selon l&apos;avis juridique, notamment au regard du DARE Act 2024.]</Todo>
        </p>
        <p>
          Version bêta : tant que le Service fonctionne sur le réseau de test de Solana (devnet), les SOL et les jetons utilisés sont fictifs et
          n&apos;ont aucune valeur.
        </p>
      </>
    ),
  },
  {
    titre: "Ton portefeuille",
    contenu: (
      <p>
        Tu accèdes au Service avec ton propre portefeuille (par exemple Phantom ou Solflare) ou avec un portefeuille créé par notre prestataire
        Privy lors d&apos;une connexion par e-mail. Dans les deux cas, tu es seul responsable de l&apos;accès à ton portefeuille et de sa sécurité.
        Nous ne pouvons pas récupérer un portefeuille perdu ni des fonds envoyés par erreur.
      </p>
    ),
  },
  {
    titre: "Créer un jeton",
    contenu: (
      <>
        <p>
          Quand tu crées un jeton, tu en es le créateur et tu es seul responsable de son nom, de son image, de sa description et de la façon dont
          tu le présentes. Les informations inscrites sur la blockchain sont définitives.
        </p>
        <p>
          Nous pouvons masquer un jeton de l&apos;interface du Service s&apos;il enfreint ces conditions. Masquer un jeton ne le supprime pas de la
          blockchain, où il reste échangeable.
        </p>
      </>
    ),
  },
  {
    titre: "Nature des jetons et risques",
    contenu: (
      <>
        <p>
          Les jetons créés sur le Service sont des memecoins : des objets culturels et spéculatifs, sans valeur garantie, sans projet ni promesse
          de rendement. Ce ne sont ni une monnaie ayant cours légal, ni des titres financiers. En les utilisant, tu acceptes notamment les
          risques suivants :
        </p>
        <ul>
          <li>volatilité extrême et perte possible de la totalité des sommes engagées ;</li>
          <li>revente massive par le créateur ou par d&apos;autres détenteurs ;</li>
          <li>défaillance ou faille des programmes de la blockchain et des protocoles tiers ;</li>
          <li>congestion du réseau, erreurs de transaction et irréversibilité des opérations ;</li>
          <li>évolution des lois et de la fiscalité applicables aux crypto-actifs.</li>
        </ul>
        <p>Tu es seul responsable de tes déclarations fiscales.</p>
      </>
    ),
  },
  {
    titre: "Frais",
    contenu: (
      <p>
        Créer un jeton coûte 0,02 SOL. Chaque achat ou vente sur la courbe supporte des frais de 1 % : 20 % pour le protocole Meteora, puis 70 %
        du reste pour le créateur du jeton et 30 % pour Tiers-État. S&apos;y ajoutent les frais du réseau Solana. Les frais peuvent évoluer pour
        les jetons créés après une modification ; les jetons existants conservent les règles inscrites sur la blockchain.
      </p>
    ),
  },
  {
    titre: "Points, rangs, Fondateurs et invitations",
    contenu: (
      <p>
        Les points des Cahiers de doléances, les rangs, le statut de Fondateur et les invitations sont des éléments de jeu. Ils n&apos;ont aucune
        valeur monétaire, ne s&apos;achètent pas, ne se vendent pas et ne se transfèrent pas. Ils ne constituent ni une promesse de jeton ni une
        promesse de récompense. Nous pouvons modifier le barème et retirer les points obtenus de manière abusive.
      </p>
    ),
  },
  {
    titre: "Contenus et informations de tiers",
    contenu: (
      <p>
        Tu nous autorises à afficher sur le Service les contenus que tu publies (images, textes, commentaires). Les titres, liens et images
        d&apos;actualité restent la propriété de leurs auteurs et éditeurs. Les données de marché du Radar proviennent de services tiers et sont
        fournies pour information, sans garantie d&apos;exactitude : les jetons qui y figurent ne sont ni vérifiés ni recommandés par nous.
      </p>
    ),
  },
  {
    titre: "Ce qui est interdit",
    contenu: (
      <ul>
        <li>usurper l&apos;identité d&apos;une personne, d&apos;une marque ou d&apos;une institution, ou présenter un jeton comme « officiel » sans l&apos;être ;</li>
        <li>publier des contenus haineux, discriminatoires, violents, illicites ou portant atteinte aux droits d&apos;autrui ;</li>
        <li>manipuler les prix ou les classements : échanges fictifs, comptes multiples, robots, achats coordonnés pour tromper ;</li>
        <li>utiliser le Service pour blanchir des fonds, financer des activités illicites ou contourner des sanctions ;</li>
        <li>perturber le Service ou tenter d&apos;en contourner les protections.</li>
      </ul>
    ),
  },
  {
    titre: "Suspension",
    contenu: (
      <p>
        Nous pouvons restreindre ou suspendre ton accès à l&apos;interface en cas de violation de ces conditions, d&apos;obligation légale ou de
        risque pour les autres utilisateurs. Tes jetons et tes fonds restent dans ton portefeuille, sur la blockchain.
      </p>
    ),
  },
  {
    titre: "Aucun conseil",
    contenu: (
      <p>
        Rien sur le Service ne constitue un conseil en investissement, juridique ou fiscal, ni une recommandation d&apos;acheter ou de vendre un
        jeton. Les classements, les actualités et les indicateurs sont fournis à titre d&apos;information.
      </p>
    ),
  },
  {
    titre: "Responsabilité",
    contenu: (
      <p>
        Le Service est fourni « en l&apos;état », sans garantie de disponibilité ni d&apos;absence d&apos;erreur. Dans les limites permises par la loi,
        nous ne sommes pas responsables des pertes liées à la valeur des jetons, aux actes des autres utilisateurs, aux protocoles tiers ou au
        réseau Solana. <Todo>[Plafond de responsabilité et clause d&apos;indemnisation à définir avec l&apos;avocat.]</Todo>
      </p>
    ),
  },
  {
    titre: "Données personnelles",
    contenu: (
      <p>
        Nous traitons un minimum de données : adresse de portefeuille, pseudo et contenus publiés, e-mail si tu l&apos;utilises. Les opérations
        sur la blockchain sont publiques par nature. Le détail figure dans les{" "}
        <Link href="/mentions-legales" className="underline underline-offset-2">
          mentions légales
        </Link>
        .
      </p>
    ),
  },
  {
    titre: "Modifications",
    contenu: (
      <p>Nous pouvons modifier ces conditions. La version en vigueur est celle publiée sur cette page ; continuer à utiliser le Service vaut acceptation.</p>
    ),
  },
  {
    titre: "Droit applicable et litiges",
    contenu: (
      <p>
        Ces conditions sont régies par <Todo>[le droit des Bahamas]</Todo>. Avant toute action, les parties tentent de résoudre le différend à
        l&apos;amiable pendant 60 jours. À défaut, le litige est tranché par <Todo>[arbitrage, lieu et institution à définir]</Todo>, sous
        réserve des droits impératifs dont tu bénéficies en tant que consommateur dans ton pays de résidence.
      </p>
    ),
  },
  {
    titre: "Contact",
    contenu: (
      <p>
        Pour toute question : <Todo>[adresse e-mail de contact]</Todo>, ou par message privé sur{" "}
        <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          X @tiersetats
        </a>
        .
      </p>
    ),
  },
];

export default function CguPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_ul]:my-2 [&_ul]:space-y-1">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Conditions d&apos;utilisation</h1>
        <LegalNotice />
        <p className="text-xs">Version bêta du 7 octobre 2026. Les passages surlignés sont à compléter une fois la société constituée.</p>
      </header>
      {SECTIONS.map((s, i) => (
        <section key={s.titre}>
          <h2 className="text-base font-semibold text-foreground">
            {i + 1}. {s.titre}
          </h2>
          {s.contenu}
        </section>
      ))}
    </article>
  );
}
