#!/usr/bin/env bash
# Enregistre les secrets Supabase dans .env.local sans les afficher.
set -euo pipefail
cd "$(dirname "$0")/.."
ENV=.env.local
REF=ypbkvgwbceoltjpwlgmg

set_var() { # set_var NOM VALEUR : remplace ou ajoute la ligne
  local name=$1 value=$2 tmp
  tmp=$(mktemp)
  grep -v "^${name}=" "$ENV" > "$tmp" || true
  printf '%s=%s\n' "$name" "$value" >> "$tmp"
  mv "$tmp" "$ENV"
  chmod 600 "$ENV"
}

ask_secret() { # ask_secret "question" -> valeur non vide (masquée)
  local value=""
  while [[ -z "$value" ]]; do
    read -rsp "$1" value; echo
    value="${value//[[:space:]]/}"
    if [[ -z "$value" ]]; then
      echo "  ✗ Rien reçu. Copie la valeur, puis colle-la avec Cmd+V AVANT d'appuyer sur Entrée."
    else
      echo "  ✓ ${#value} caractères reçus"
    fi
  done
  REPLY_SECRET=$value
}

echo "1/2 — Mot de passe de la base (Supabase > Project Settings > Database)"
ask_secret "Colle le mot de passe puis Entrée (rien ne s'affiche, c'est normal) : "
DB_PASS_ENC=$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$REPLY_SECRET")
set_var SUPABASE_DB_URL "postgresql://postgres:${DB_PASS_ENC}@db.${REF}.supabase.co:5432/postgres"
echo "  → SUPABASE_DB_URL enregistrée"
echo

echo "2/2 — Clé secrète (Supabase > Project Settings > API Keys > Secret keys)"
while true; do
  ask_secret "Colle la clé sb_secret_... puis Entrée : "
  if [[ "$REPLY_SECRET" == sb_secret_* || "$REPLY_SECRET" == eyJ* ]]; then
    set_var SUPABASE_SECRET_KEY "$REPLY_SECRET"
    echo "  → SUPABASE_SECRET_KEY enregistrée"
    break
  fi
  echo "  ✗ Ce n'est pas une clé secrète (elle doit commencer par sb_secret_). Réessaie."
done
echo
echo "Terminé ✓ Tu peux dire à Claude : c'est fait."
