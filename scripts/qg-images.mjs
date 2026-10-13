// Prépare les images du QG : ~/Desktop/qg-*.png → public/images/qg/*.webp
// Le décor est compressé ; les personnages (fond transparent) sont rognés au plus près puis réduits.
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const SRC = path.join(homedir(), "Desktop");
const OUT = path.join(process.cwd(), "public/images/qg");
const TEAM = ["jacques", "marianne", "camille", "louis", "livre", "gavroche"];
mkdirSync(OUT, { recursive: true });

const decor = path.join(SRC, "qg-decor.png");
if (existsSync(decor)) {
  const info = await sharp(decor).resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(OUT, "decor.webp"));
  console.log("décor", info.width, "x", info.height, Math.round(info.size / 1024), "Ko");
}
for (const id of TEAM) {
  const file = path.join(SRC, `qg-${id}.png`);
  if (!existsSync(file)) { console.log("manque", id); continue; }
  const { hasAlpha } = await sharp(file).metadata();
  if (!hasAlpha) { console.log("PAS DE TRANSPARENCE", id); continue; }
  const trimmed = await sharp(file).trim({ threshold: 10 }).toBuffer();
  const info = await sharp(trimmed).resize({ height: 640, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 90 }).toFile(path.join(OUT, `${id}.webp`));
  console.log(id, info.width, "x", info.height, Math.round(info.size / 1024), "Ko");
}
