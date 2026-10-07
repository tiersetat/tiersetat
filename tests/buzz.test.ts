import { describe, expect, it } from "vitest";
import { cleanText, parseFeed } from "@/lib/buzz";
import { suggestName, suggestTicker } from "@/lib/buzz-suggest";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title><![CDATA[La <b>baguette</b> passe à 2 &euro; ?]]></title><link>https://ex.fr/a</link>
<description>&lt;p&gt;Les boulangers r&eacute;agissent&lt;/p&gt;</description><pubDate>Mon, 06 Oct 2026 08:00:00 +0200</pubDate></item>
<item><title>Sans lien</title></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Grève &amp; manif demain</title><link href="https://reddit.com/r/france/x"/><updated>2026-10-06T09:00:00+00:00</updated></entry>
<entry><title>Forum Libre - 2026-10-06</title><link href="https://reddit.com/r/france/y"/><updated>2026-10-06T06:00:00+00:00</updated></entry>
</feed>`;

describe("parseFeed", () => {
  it("lit un flux RSS (CDATA, HTML, entités) et ignore les éléments sans lien", () => {
    const items = parseFeed(RSS, "Test", "media");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("La baguette passe à 2 € ?");
    expect(items[0].excerpt).toBe("Les boulangers réagissent");
    expect(items[0].publishedAt).toBe("2026-10-06T06:00:00.000Z");
  });
  it("lit un flux Atom (Reddit)", () => {
    const items = parseFeed(ATOM, "r/france", "reddit");
    expect(items[0]).toMatchObject({ title: "Grève & manif demain", url: "https://reddit.com/r/france/x" });
  });
  it("tolère une date illisible", () => {
    const xml = RSS.replace("Mon, 06 Oct 2026 08:00:00 +0200", "pas une date");
    expect(() => parseFeed(xml, "Test", "media")).not.toThrow();
  });
});

describe("cleanText", () => {
  it("décode les entités numériques", () => {
    expect(cleanText("L&#8217;Assembl&#xE9;e")).toBe("L’Assemblée");
  });
});

describe("suggestions", () => {
  it("coupe le nom à 32 octets entre deux mots", () => {
    const n = suggestName("Le gouvernement annonce une réforme surprise des retraites ce matin");
    expect(new TextEncoder().encode(n).length).toBeLessThanOrEqual(32);
    expect(n).toBe("Le gouvernement annonce une");
  });
  it("choisit un ticker marquant, sans accent, ≤ 10 caractères", () => {
    expect(suggestTicker("La baguette passe à 2 euros")).toBe("BAGUETTE");
    expect(suggestTicker("Réforme des retraites : l'Assemblée s'enflamme")).toMatch(/^[A-Z0-9]{2,10}$/);
    expect(suggestTicker("à la")).toBe("MEME");
  });
});

import { isSensitive } from "@/lib/buzz-suggest";

describe("isSensitive", () => {
  it("écarte les drames et les victimes réelles", () => {
    expect(isSensitive("Une enquête après une suspicion d'agression sexuelle")).toBe(true);
    expect(isSensitive("Trois morts dans un accident de la route")).toBe(true);
    expect(isSensitive("Attentat déjoué à Lyon")).toBe(true);
    expect(isSensitive("Deux navires frappés par des drones")).toBe(true);
  });
  it("garde l'actu légère ou politique", () => {
    expect(isSensitive("La baguette passe à 2 euros")).toBe(false);
    expect(isSensitive("Réforme des retraites : l'Assemblée s'enflamme")).toBe(false);
    expect(isSensitive("Le PSG remporte le Classique")).toBe(false);
  });
});

describe("extractImage", () => {
  const item = (inner: string) => parseFeed(`<rss><channel><item><title>T</title><link>https://ex.fr/a</link>${inner}</item></channel></rss>`, "S", "media")[0];

  it("lit enclosure, media:content et media:thumbnail", () => {
    expect(item('<enclosure type="image/jpeg" url="https://img.fr/a.jpg"/>').image).toBe("https://img.fr/a.jpg");
    expect(item('<media:content url="https://img.fr/b.jpg" width="644"/>').image).toBe("https://img.fr/b.jpg");
    expect(item('<media:thumbnail url="https://img.fr/c.jpg?w=1&amp;h=2"/>').image).toBe("https://img.fr/c.jpg?w=1&h=2");
  });

  it("se rabat sur la première image du contenu", () => {
    expect(item('<description>&lt;img src="https://img.fr/d.jpg" /&gt; texte</description>').image).toBe("https://img.fr/d.jpg");
  });

  it("refuse http en clair, data: et les enclosures non image", () => {
    expect(item('<enclosure type="audio/mpeg" url="https://img.fr/a.mp3"/>').image).toBeNull();
    expect(item('<media:content url="http://img.fr/b.jpg"/>').image).toBeNull();
    expect(item('<description>&lt;img src="data:image/png;base64,AAA" /&gt;</description>').image).toBeNull();
  });
});
