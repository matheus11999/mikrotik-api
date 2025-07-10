#!/bin/bash

# Script otimizado para iniciar a MikroTik API com alta memória RAM

echo "🚀 Iniciando MikroTik API com configurações de alta memória..."

# Configurações de memória ampliadas
MAX_HEAP=1024
SEMI_SPACE=128

echo "💾 Configurações de memória:"
echo "   - Heap Principal: ${MAX_HEAP}MB"
echo "   - Semi Space: ${SEMI_SPACE}MB" 
echo "   - Total estimado: ~${MAX_HEAP}MB de RAM"

echo "⚙️  Configurações do Node.js:"
echo "   - Max Old Space Size: ${MAX_HEAP}MB"
echo "   - Max Semi Space Size: ${SEMI_SPACE}MB"
echo "   - Garbage Collection: Habilitado"
echo "   - Memory Optimization: Desabilitado (para usar mais RAM)"
echo ""

# Parar processo anterior se existir
echo "🛑 Parando processos anteriores..."
pkill -f "node.*app.js" 2>/dev/null || true
sleep 2

# Iniciar com configurações de alta memória
echo "▶️  Iniciando servidor..."
node \
  --max-old-space-size=$MAX_HEAP \
  --max-semi-space-size=$SEMI_SPACE \
  --expose-gc \
  app.js

echo "✅ MikroTik API iniciada com sucesso!"