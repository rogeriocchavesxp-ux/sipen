#!/bin/bash
# Sincroniza chamado.html → suporte.html
# Usar após qualquer alteração em chamado.html
cp "$(dirname "$0")/../chamado.html" "$(dirname "$0")/../suporte.html"
echo "suporte.html atualizado."
