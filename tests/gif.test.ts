import { describe, expect, it } from "vitest";
import { gifOf, normalizeGifUrl } from "@/lib/gif";

describe("GIF de la communauté", () => {
  it("accepte les liens Giphy et Tenor", () => {
    expect(normalizeGifUrl("https://media.giphy.com/media/abc123XYZ/giphy.gif")).toBe("https://media.giphy.com/media/abc123XYZ/giphy.gif");
    expect(normalizeGifUrl("https://giphy.com/gifs/money-rich-l0HFkA6omUyjVYqw8")).toBe("https://media.giphy.com/media/l0HFkA6omUyjVYqw8/giphy.gif");
    expect(normalizeGifUrl("https://media.tenor.com/AbCdE/tenor.gif")).toBe("https://media.tenor.com/AbCdE/tenor.gif");
  });
  it("refuse les autres sites", () => {
    expect(normalizeGifUrl("https://example.com/x.gif")).toBeNull();
    expect(normalizeGifUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeGifUrl("https://tenor.com/view/money-gif-123")).toBeNull();
  });
  it("reconnaît un message GIF", () => {
    expect(gifOf("[gif]https://media.giphy.com/media/abc123XYZ/giphy.gif")).toBe("https://media.giphy.com/media/abc123XYZ/giphy.gif");
    expect(gifOf("[gif]https://evil.com/a.gif")).toBeNull();
    expect(gifOf("bonjour")).toBeNull();
  });
});
