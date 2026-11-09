#!/bin/bash
# Sincroniza chamado.html → suporte.html
# Usar após qualquer alteração em chamado.html
cp "$(dirname "$0")/../chamado.html" "$(dirname "$0")/../suporte/index.html"
echo "suporte/index.html atualizado."
