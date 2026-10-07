#!/usr/bin/env bash
# Publie la version actuelle du code dans le dépôt public (github.com/tiersetat/tiersetat),
# sans la liste de vérification interne. Usage : scripts/publier-code-public.sh "Message"
set -euo pipefail
MESSAGE="${1:-Mise à jour du code}"
ROOT="$(git rev-parse --show-toplevel)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone -q https://github.com/tiersetat/tiersetat.git "$TMP/public"
# Remplace tout le contenu par la version actuelle (fichiers suivis uniquement), sauf les notes internes
find "$TMP/public" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
git -C "$ROOT" archive HEAD | tar -x -C "$TMP/public"
rm -f "$TMP/public/LANCEMENT.md"
sed -i.bak '/LANCEMENT\.md/d' "$TMP/public/README.md" && rm -f "$TMP/public/README.md.bak"

cd "$TMP/public"
git add -A
if git diff --cached --quiet; then
  echo "Rien de nouveau à publier."
  exit 0
fi
git commit -q -m "$MESSAGE"
git push -q origin main
echo "Publié : https://github.com/tiersetat/tiersetat"
