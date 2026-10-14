import { describe, expect, it } from "vitest";
import { sendRisk } from "@/lib/send-safety";

describe("protections d'envoi", () => {
  it("signale une nouvelle adresse et un gros montant", () => {
    expect(sendRisk({ recipient: "A", amount: 10, balance: 100, amountUsd: 10, known: [] })).toEqual({ newRecipient: true, big: false });
    expect(sendRisk({ recipient: "A", amount: 60, balance: 100, amountUsd: 60, known: ["A"] })).toEqual({ newRecipient: false, big: true });
    expect(sendRisk({ recipient: "A", amount: 600, balance: 10_000, amountUsd: 600, known: ["A"] }).big).toBe(true);
  });
});
