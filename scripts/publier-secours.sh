#!/usr/bin/env bash
# Assemble et publie l'interface de secours : IPFS (Pinata) + GitHub Pages (tiersetat.github.io).
# Met à jour src/lib/secours.json (adresse IPFS affichée sur /verifier).
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
node scripts/build-ipfs.mjs
CID="$(node scripts/publish-ipfs.mjs | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).cid))')"
printf '{ "cid": "%s", "pages": "https://tiersetat.github.io/", "publishedAt": "%s" }\n' "$CID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > src/lib/secours.json

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R ipfs/dist/. "$TMP/" && touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b main && git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" commit -q -m "Interface de secours ($CID)"
git push -q -f https://github.com/tiersetat/tiersetat.github.io.git HEAD:main
echo "IPFS : $CID"
echo "GitHub Pages : https://tiersetat.github.io/"
