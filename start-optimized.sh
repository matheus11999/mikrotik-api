#!/bin/bash

# Script otimizado para iniciar a MikroTik API com clustering e alta memória RAM

echo "🚀 Iniciando MikroTik API com clustering e alta performance..."

# Detectar número de CPUs
CPU_COUNT=$(nproc)
echo "🖥️  Detectados ${CPU_COUNT} núcleos de CPU"

# Configurações de memória MÁXIMAS
MAX_HEAP=2048
SEMI_SPACE=256
INITIAL_HEAP=512

echo "💾 Configurações de memória EXPANDIDA:"
echo "   - Heap Máximo: ${MAX_HEAP}MB por worker"
echo "   - Heap Inicial: ${INITIAL_HEAP}MB por worker"
echo "   - Semi Space: ${SEMI_SPACE}MB por worker" 
echo "   - Workers: ${CPU_COUNT} processos"
echo "   - Total estimado: ~$((MAX_HEAP * CPU_COUNT))MB de RAM"

echo "⚙️  Configurações do Node.js:"
echo "   - Max Old Space Size: ${MAX_HEAP}MB"
echo "   - Initial Old Space Size: ${INITIAL_HEAP}MB"
echo "   - Max Semi Space Size: ${SEMI_SPACE}MB"
echo "   - Clustering: Habilitado (${CPU_COUNT} workers)"
echo "   - Garbage Collection: Habilitado"
echo "   - Rate Limiting: Aumentado para alta carga"
echo ""

# Parar processo anterior se existir
echo "🛑 Parando processos anteriores..."
pkill -f "node.*cluster.js" 2>/dev/null || true
pkill -f "node.*app.js" 2>/dev/null || true
sleep 2

# Escolher modo de execução
if [ "$1" = "single" ]; then
    echo "▶️  Iniciando em modo SINGLE PROCESS..."
    node \
      --max-old-space-size=$MAX_HEAP \
      --max-semi-space-size=$SEMI_SPACE \
      --initial-old-space-size=$INITIAL_HEAP \
      --expose-gc \
      app.js
else
    echo "▶️  Iniciando em modo CLUSTER com ${CPU_COUNT} workers..."
    node \
      --max-old-space-size=$MAX_HEAP \
      --max-semi-space-size=$SEMI_SPACE \
      --initial-old-space-size=$INITIAL_HEAP \
      --expose-gc \
      cluster.js
fi

echo "✅ MikroTik API iniciada com sucesso!"