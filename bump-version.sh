#!/usr/bin/env bash
# bump-version.sh — atualiza todos os ?v= e CACHE_VERSION do SIPEN
# Uso: ./bump-version.sh 6.30.88
#
# Arquivos afetados:
#   index.html        → todos os ?v= (CSS + JS)
#   core/router.js    → ?v= nas entradas do _VIEW_MAP
#   core/init.js      → ?v= do sidebar.html
#   sw.js             → CACHE_VERSION = 'sipen-vX.Y.Z'
#   views/sidebar.html → número de versão exibido no canto superior esquerdo

set -e

NEW_VER="${1:?Informe a nova versão. Ex: ./bump-version.sh 6.30.88}"

if ! echo "$NEW_VER" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Erro: formato inválido. Use X.Y.Z  (ex: 6.30.88)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
CHANGED=0

bump_qv() {
  local file="$ROOT/$1"
  if [ ! -f "$file" ]; then
    echo "  AVISO: $1 não encontrado" >&2
    return
  fi
  if grep -q '?v=[0-9]' "$file"; then
    sed -i '' "s/?v=[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*/?v=${NEW_VER}/g" "$file"
    echo "  ok  $1"
    CHANGED=$((CHANGED + 1))
  else
    echo "  --  $1  (sem ?v= para atualizar)"
  fi
}

bump_sw() {
  local file="$ROOT/sw.js"
  if [ ! -f "$file" ]; then
    echo "  AVISO: sw.js não encontrado" >&2
    return
  fi
  local old
  old=$(grep -o "sipen-v[0-9.]*" "$file" | head -1)
  if [ "$old" = "sipen-v${NEW_VER}" ]; then
    echo "  --  sw.js  (CACHE_VERSION já é ${NEW_VER})"
    return
  fi
  sed -i '' "s/CACHE_VERSION = 'sipen-v[0-9.]*'/CACHE_VERSION = 'sipen-v${NEW_VER}'/" "$file"
  echo "  ok  sw.js  (${old:-desconhecido} → sipen-v${NEW_VER})"
  CHANGED=$((CHANGED + 1))
}

echo ""
echo "Bumping SIPEN para v${NEW_VER}"
echo "────────────────────────────"
bump_qv "index.html"
bump_qv "core/router.js"
bump_qv "core/init.js"
bump_sw

# sidebar.html — versão exibida no canto superior esquerdo
bump_sidebar() {
  local file="$ROOT/views/sidebar.html"
  if [ ! -f "$file" ]; then
    echo "  AVISO: views/sidebar.html não encontrado" >&2
    return
  fi
  local old
  old=$(grep -o 'v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*' "$file" | head -1)
  if [ "$old" = "v${NEW_VER}" ]; then
    echo "  --  views/sidebar.html  (versão já é ${NEW_VER})"
    return
  fi
  sed -i '' "s/v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*/v${NEW_VER}/g" "$file"
  echo "  ok  views/sidebar.html  (${old:-desconhecido} → v${NEW_VER})"
  CHANGED=$((CHANGED + 1))
}

bump_sidebar
echo "────────────────────────────"
echo "${CHANGED} arquivo(s) atualizado(s)."
echo ""
echo "Próximo passo:"
echo "  git add index.html core/router.js core/init.js sw.js views/sidebar.html"
echo "  git commit -m \"chore: bump versão para ${NEW_VER}\""
