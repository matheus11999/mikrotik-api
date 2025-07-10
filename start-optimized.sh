#!/bin/bash

# Script otimizado para iniciar a MikroTik API com 256MB de memória

echo "🚀 Iniciando MikroTik API com configurações otimizadas..."

# Configuração fixa de 256MB
MAX_HEAP=256
echo "💾 Configuração de memória: ${MAX_HEAP}MB"

echo "⚙️  Configurações do Node.js:"
echo "   - Max Old Space Size: ${MAX_HEAP}MB"
echo "   - Garbage Collection: Habilitado"
echo "   - Optimization: Habilitado"
echo ""

# Parar processo anterior se existir
echo "🛑 Parando processos anteriores..."
pkill -f "node.*app.js" 2>/dev/null || true
sleep 2

# Iniciar com configurações otimizadas
echo "▶️  Iniciando servidor..."
node \
  --max-old-space-size=$MAX_HEAP \
  --expose-gc \
  --optimize-for-size \
  --memory-reducer \
  app.js

echo "✅ MikroTik API iniciada com sucesso!"