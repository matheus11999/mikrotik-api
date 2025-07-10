#!/bin/bash

# Script otimizado para iniciar a MikroTik API com alta memória RAM

echo "🚀 Iniciando MikroTik API com configurações de alta memória..."

# Configurações de memória MÁXIMAS
MAX_HEAP=2048
SEMI_SPACE=256
INITIAL_HEAP=512

echo "💾 Configurações de memória EXPANDIDA:"
echo "   - Heap Máximo: ${MAX_HEAP}MB"
echo "   - Heap Inicial: ${INITIAL_HEAP}MB"
echo "   - Semi Space: ${SEMI_SPACE}MB" 
echo "   - Total estimado: ~${MAX_HEAP}MB de RAM"

echo "⚙️  Configurações do Node.js:"
echo "   - Max Old Space Size: ${MAX_HEAP}MB"
echo "   - Initial Old Space Size: ${INITIAL_HEAP}MB"
echo "   - Max Semi Space Size: ${SEMI_SPACE}MB"
echo "   - Garbage Collection: Habilitado"
echo "   - Heap Expansion: Automático quando necessário"
echo ""

# Parar processo anterior se existir
echo "🛑 Parando processos anteriores..."
pkill -f "node.*app.js" 2>/dev/null || true
sleep 2

# Iniciar com configurações de ALTA memória
echo "▶️  Iniciando servidor com 2GB de limite..."
node \
  --max-old-space-size=$MAX_HEAP \
  --max-semi-space-size=$SEMI_SPACE \
  --initial-old-space-size=$INITIAL_HEAP \
  --expose-gc \
  app.js

echo "✅ MikroTik API iniciada com sucesso!"