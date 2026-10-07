import { describe, expect, it } from "vitest";
import { INVITE_CODE_RE, newInviteCode, parseInviteCode } from "@/lib/invite";

describe("codes d'invitation", () => {
  it("génère des codes valides de 6 caractères sans ambiguïté", () => {
    for (let i = 0; i < 200; i++) {
      const code = newInviteCode();
      expect(code).toMatch(INVITE_CODE_RE);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("normalise et valide un code saisi", () => {
    expect(parseInviteCode(" ab3xyz ")).toBe("AB3XYZ");
    expect(parseInviteCode("AB0XYZ")).toBeNull();
    expect(parseInviteCode("ABC")).toBeNull();
    expect(parseInviteCode(undefined)).toBeNull();
  });
});
