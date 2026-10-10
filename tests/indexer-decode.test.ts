import { describe, expect, it } from "vitest";
import { decodeProgramData, eventsFromLogs } from "../indexer/src/decode";

// Messages réels captés sur le réseau principal (programme pump.fun)
const CREATE =
  "G3KpTd7rY3YJAAAAVFJFTkQgQ0FUCAAAAENBVCBHSVJMQwAAAGh0dHBzOi8vaXBmcy5pby9pcGZzL1FtWFZWdkc0MUpUNjFHYjFtN21BZWtGVlNobmN6TGNKenBNZGpRd2gxbk4ycWrSznVQFjRJRYaFjNKZW+JTwykcqKrW8oq24AdScP3NL/4M2Si4Y0ABOAgE2rUrJ8wA+804qoweQirIrTBiWQ7DAR+++Jem3QS67kYw/afncMYgvshaeIV0LTGnrNelCY8BH774l6bdBLruRjD9p+dwxiC+yFp4hXQtMaes16UJjzyiymoAAAAAABDYR+PPAwAArCP8BgAAAAB4xftR0QIAAIDGpH6NAwAG3fbh7nWP3hhCXbzkbM3athr8TYO5DSf+vfko";
const TRADE =
  "vdt/007mYe4NMBbTC2GVRcLsN1oxxghdHviltFXup8kVMXiQrl/wT0SMrgYAAAAARy0G38UBAAABootf0mq0eaapzGy/awsj62GIWjceASCsqRO+7z0Ting8ospqAAAAAPwaQ4sOAAAAN3yY4Ld4AwCDuWVBAAAAADfkhZQmegIA6JMUH7GOnxV02BDheOGeMGBOMXWqLkoy38hgByfRBwkAAAAAAAAAAAAAAAAAAAAANtYnMUhbbYf64MXMFeOxcFgQgnTzF43+RObrH1NwFLwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAGJ1eQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

describe("décodage pump.fun", () => {
  it("lit une création de token", () => {
    const e = decodeProgramData(CREATE);
    expect(e?.kind).toBe("create");
    if (e?.kind !== "create") return;
    expect(e.name).toBe("TREND CAT");
    expect(e.symbol).toBe("CAT GIRL");
    expect(e.uri).toMatch(/^https:\/\/ipfs\.io\/ipfs\//);
    expect(e.mint).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(e.timestamp).toBeGreaterThan(1_700_000_000);
  });

  it("lit un échange avec son montant, son sens et le prix de la courbe", () => {
    const e = decodeProgramData(TRADE);
    expect(e?.kind).toBe("trade");
    if (e?.kind !== "trade") return;
    expect(e.solAmount).toBeGreaterThan(0);
    expect(e.tokenAmount).toBeGreaterThan(0);
    expect(typeof e.isBuy).toBe("boolean");
    expect(e.priceSol).toBeGreaterThan(0);
    // capitalisation (1 milliard de tokens) dans une plage plausible pour pump.fun
    expect(e.priceSol * 1e9).toBeGreaterThan(10);
    expect(e.priceSol * 1e9).toBeLessThan(10_000_000);
  });

  it("ignore les messages inconnus", () => {
    expect(decodeProgramData(Buffer.from("bonjour tout le monde").toString("base64"))).toBeNull();
  });
});

describe("protection contre les faux messages", () => {
  it("ignore un « Program data » écrit par un autre programme que pump.fun", () => {
    const fake = [
      "Program FLASHX8DrLbgeR8FcfNV1F5krxYcYMUdBkrP1EPBtxB9 invoke [1]",
      `Program data: ${TRADE}`,
      "Program FLASHX8DrLbgeR8FcfNV1F5krxYcYMUdBkrP1EPBtxB9 success",
    ];
    expect(eventsFromLogs(fake)).toHaveLength(0);
  });

  it("garde le message émis par pump.fun, y compris appelé par un autre programme, s'il réussit", () => {
    const real = [
      "Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]",
      "Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [2]",
      `Program data: ${TRADE}`,
      "Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success",
      "Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success",
    ];
    expect(eventsFromLogs(real)).toHaveLength(1);
    const failed = [...real.slice(0, 3), "Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P failed: custom program error"];
    expect(eventsFromLogs(failed)).toHaveLength(0);
  });

  it("donne un prix de départ dès la création", () => {
    const e = decodeProgramData(CREATE);
    expect(e?.kind === "create" && e.priceSol * 1e9).toBeGreaterThan(10);
  });
});
