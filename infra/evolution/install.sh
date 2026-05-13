#!/usr/bin/env bash
# Evolution API — script de instalação para Ubuntu 22.04 / Debian 12
# Execute como root ou com sudo: bash install.sh

set -euo pipefail

INSTALL_DIR="/opt/evolution"

echo "==> Atualizando pacotes..."
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release

# Docker
if ! command -v docker &>/dev/null; then
  echo "==> Instalando Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
    $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  echo "    Docker instalado."
else
  echo "    Docker já instalado, pulando."
fi

# Diretório de instalação
echo "==> Criando $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp docker-compose.yml "$INSTALL_DIR/"
cp Caddyfile "$INSTALL_DIR/"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  cp .env.example "$INSTALL_DIR/.env"
  echo ""
  echo "  ┌─────────────────────────────────────────────────────────┐"
  echo "  │  IMPORTANTE: edite $INSTALL_DIR/.env            │"
  echo "  │  Preencha EVOLUTION_API_KEY e POSTGRES_PASSWORD         │"
  echo "  │  antes de continuar.                                     │"
  echo "  └─────────────────────────────────────────────────────────┘"
  echo ""
  read -r -p "  Pressione ENTER após editar o .env para continuar..."
else
  echo "    .env já existe, mantendo."
fi

# Subir containers
echo "==> Subindo containers..."
cd "$INSTALL_DIR"
docker compose pull
docker compose up -d

echo ""
echo "==> Concluído!"
echo "    Evolution API: https://evolution.sipen.com.br"
echo "    Status:        docker compose -f $INSTALL_DIR/docker-compose.yml ps"
echo "    Logs:          docker compose -f $INSTALL_DIR/docker-compose.yml logs -f evolution"
