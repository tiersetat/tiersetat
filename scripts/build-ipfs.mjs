// Assemble l'interface de secours (ipfs/) en fichiers statiques autonomes dans ipfs/dist/.
import { build } from "esbuild";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const configs = [env.NEXT_PUBLIC_DBC_CONFIG, ...(env.NEXT_PUBLIC_DBC_LEGACY_CONFIGS ?? "").split(",")].map((c) => c?.trim()).filter(Boolean);

fs.rmSync("ipfs/dist", { recursive: true, force: true });
fs.mkdirSync("ipfs/dist", { recursive: true });
await build({
  entryPoints: ["ipfs/app.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: "ipfs/dist/app.js",
  define: {
    __CONFIGS__: JSON.stringify(configs),
    __CLUSTER__: JSON.stringify("devnet"),
    // RPC public par défaut : l'interface de secours ne doit dépendre d'aucune clé privée
    __DEFAULT_RPC__: JSON.stringify("https://api.devnet.solana.com"),
    "process.env.NODE_ENV": '"production"',
    global: "globalThis",
  },
  logLevel: "warning",
});
fs.copyFileSync("ipfs/index.html", "ipfs/dist/index.html");
fs.copyFileSync("public/icon-192.png", "ipfs/dist/icon.png");
const size = fs.statSync("ipfs/dist/app.js").size;
console.log(`ipfs/dist prêt · ${configs.length} configurations · app.js ${(size / 1024).toFixed(0)} Ko`);
