import { describe, expect, it } from "vitest";
import { checkQgMessage } from "@/lib/qg";

describe("règles des QG", () => {
  it("laisse passer la promotion normale", () => {
    for (const m of ["T-shirts $DETTE en préparation, qui en veut ?", "Live ce soir sur Kick à 21 h", "Postez vos photos du sticker dans la rue", "Ce mème est trop drôle", "On a dépassé 50 détenteurs !"])
      expect(checkQgMessage(m).ok).toBe(true);
  });
  it("refuse les promesses de gains", () => {
    for (const m of ["Ça va faire x100 les gars", "Gains garantis !", "Vous allez devenir riches", "Zéro risque, achetez"]) expect(checkQgMessage(m).ok).toBe(false);
  });
  it("refuse les achats coordonnés", () => {
    for (const m of ["On achète tous à 21h", "Pump ensemble ce soir", "Personne ne vend !", "Achats groupés demain"]) expect(checkQgMessage(m).ok).toBe(false);
  });
});
