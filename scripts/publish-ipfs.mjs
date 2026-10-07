// Publie l'interface de secours (ipfs/dist) sur IPFS via Pinata et affiche son adresse (CID).
// Usage : node scripts/build-ipfs.mjs && node scripts/publish-ipfs.mjs
import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!env.PINATA_JWT) throw new Error("PINATA_JWT manquant");

const dir = "ipfs/dist";
const form = new FormData();
for (const name of fs.readdirSync(dir)) {
  const type = name.endsWith(".html") ? "text/html" : name.endsWith(".js") ? "text/javascript" : name.endsWith(".png") ? "image/png" : "application/octet-stream";
  // Le préfixe de dossier fait de l'envoi un répertoire IPFS (index.html servi à la racine)
  form.append("file", new Blob([fs.readFileSync(path.join(dir, name))], { type }), `tiersetat-secours/${name}`);
}
form.append("pinataMetadata", JSON.stringify({ name: `tiersetat-secours-${new Date().toISOString().slice(0, 10)}` }));
form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { Authorization: `Bearer ${env.PINATA_JWT}` }, body: form });
const json = await res.json();
if (!res.ok) throw new Error(`Pinata ${res.status} : ${JSON.stringify(json).slice(0, 200)}`);
const cid = json.IpfsHash;
console.log(JSON.stringify({ cid, gateways: [`https://${cid}.ipfs.dweb.link/`, `https://ipfs.io/ipfs/${cid}/`, env.PINATA_GATEWAY ? `https://${env.PINATA_GATEWAY}/ipfs/${cid}/` : null].filter(Boolean) }, null, 2));
