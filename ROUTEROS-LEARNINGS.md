# 🧠 Aprendizados sobre RouterOS Node API

## 📚 Conhecimentos Adquiridos com node-routeros

Durante o desenvolvimento desta API, adquiri conhecimentos profundos sobre o funcionamento do MikroTik RouterOS e sua API. Aqui estão os principais aprendizados:

---

## 🔌 Conexão e Autenticação

### ✅ **Configuração Básica**
```javascript
const { RouterOSAPI } = require('node-routeros');

const conn = new RouterOSAPI({
    host: '192.168.1.1',
    user: 'admin',
    password: 'senha123',
    port: 8728,        // Porta padrão da API
    timeout: 10000     // Timeout em ms
});

await conn.connect();
```

### 📝 **Aprendizados sobre Conexão:**
1. **Porta Padrão**: A API RouterOS usa porta `8728` por padrão
2. **Timeout**: Importante definir timeout para evitar conexões travadas
3. **Reutilização**: Conexões podem ser reutilizadas para múltiplas operações
4. **Cache**: Implementar cache de conexões melhora significativamente a performance

---

## 📊 Comandos RouterOS

### 🔍 **Estrutura de Comandos**

#### **Padrão de Comandos:**
```
/caminho/para/recurso/ação
```

#### **Exemplos:**
- `/ip/hotspot/user/print` - Listar usuários hotspot
- `/ip/hotspot/user/add` - Adicionar usuário
- `/system/identity/print` - Obter identidade do sistema

### ✅ **Comandos Implementados:**

#### **Hotspot:**
```javascript
// Listar usuários
await conn.write('/ip/hotspot/user/print');

// Adicionar usuário
await conn.write('/ip/hotspot/user/add', [
    '=name=usuario1',
    '=password=senha123',
    '=profile=default'
]);

// Atualizar usuário
await conn.write('/ip/hotspot/user/set', [
    '=.id=*1',
    '=password=nova_senha'
]);

// Remover usuário
await conn.write('/ip/hotspot/user/remove', ['=.id=*1']);
```

#### **Sistema:**
```javascript
// Informações do sistema
await conn.write('/system/resource/print');
await conn.write('/system/identity/print');
await conn.write('/system/clock/print');

// Logs do sistema
await conn.write('/log/print');

// Backup
await conn.write('/system/backup/save', ['=name=backup-auto']);
```

#### **Scripts:**
```javascript
// Listar scripts
await conn.write('/system/script/print');

// Executar script
await conn.write('/system/script/run', ['=.id=*1']);

// Adicionar script
await conn.write('/system/script/add', [
    '=name=meu_script',
    '=source=:log info "Hello World"'
]);
```

---

## 🎯 Estrutura de Dados

### 📋 **Formato de Parâmetros**

#### **Sintaxe:**
- `=propriedade=valor` - Definir propriedade
- `=.id=*1` - Referenciar por ID
- `?propriedade=valor` - Filtrar (query)

#### **Exemplos Práticos:**
```javascript
// Parâmetros para criar usuário hotspot
const params = [
    '=name=usuario_teste',
    '=password=123456',
    '=profile=1M',
    '=server=hotspot1',
    '=comment=Usuário de teste',
    '=disabled=false'
];

// Parâmetros para atualizar
const updateParams = [
    '=.id=*1',           // ID do item a atualizar
    '=profile=2M',       // Nova propriedade
    '=comment=Atualizado' // Novo comentário
];
```

### 🔑 **IDs do RouterOS**

#### **Características dos IDs:**
- Formato: `*1`, `*2`, `*3`, etc.
- São únicos por tipo de recurso
- Podem mudar após reboot/reconfiguração
- Sempre usar `.id` para referenciar

#### **Boas Práticas:**
```javascript
// ✅ CORRETO - Usar .id para referência
user['.id']  // "*1", "*2", etc.

// ❌ EVITAR - Assumir formato específico
user.id      // undefined
```

---

## 🔥 Hotspot - Descobertas Importantes

### 👥 **Gerenciamento de Usuários**

#### **Propriedades Principais:**
```javascript
{
    ".id": "*1",
    "name": "usuario1",
    "password": "senha123",
    "profile": "default",
    "server": "hotspot1",
    "disabled": "false",  // String, não boolean!
    "comment": "Descrição",
    "limit-uptime": "00:00:00",
    "limit-bytes-in": "0",
    "limit-bytes-out": "0",
    "bytes-in": "1024000",
    "bytes-out": "512000"
}
```

#### **Aprendizados Importantes:**
1. **Tipos de Dados**: Muitos valores são strings, não tipos nativos
2. **Boolean como String**: `"true"/"false"`, não `true/false`
3. **Bytes**: Valores numéricos como strings
4. **Tempo**: Formato `HH:MM:SS` para timeouts

### 📊 **Profiles de Usuário**

#### **Configurações Comuns:**
```javascript
{
    "name": "1M",
    "rate-limit": "1M/1M",      // Upload/Download
    "session-timeout": "01:00:00", // 1 hora
    "idle-timeout": "00:10:00",     // 10 minutos
    "shared-users": "1",
    "keepalive-timeout": "00:02:00"
}
```

#### **Rate Limiting Syntax:**
- `1M/1M` - 1 Mbps upload/download
- `512k/2M` - 512 Kbps up, 2 Mbps down
- `0/0` - Sem limite

### 🔴 **Usuários Ativos**

#### **Informações Disponíveis:**
```javascript
{
    ".id": "*1",
    "user": "usuario1",
    "address": "192.168.1.100",
    "mac-address": "AA:BB:CC:DD:EE:FF",
    "uptime": "00:15:30",
    "bytes-in": "1024000",
    "bytes-out": "512000",
    "packets-in": "1500",
    "packets-out": "1200"
}
```

---

## 🖥️ Sistema - Informações Valiosas

### 📊 **Recursos do Sistema**

#### **Informações Críticas:**
```javascript
{
    "uptime": "1w2d03:04:05",
    "version": "7.13.2",
    "cpu-load": "5",              // Percentual como string
    "free-memory": "134217728",   // Bytes como string
    "total-memory": "268435456",
    "cpu": "MIPS",
    "cpu-count": "1",
    "board-name": "RB951G-2HnD"
}
```

#### **Conversões Necessárias:**
```javascript
// CPU Load
const cpuLoad = parseInt(resource['cpu-load']);

// Memória
const freeMemoryMB = parseInt(resource['free-memory']) / 1024 / 1024;

// Uptime parsing necessário para formato humano
```

### 📝 **Logs do Sistema**

#### **Estrutura dos Logs:**
```javascript
{
    ".id": "*1",
    "time": "10:30:15",
    "topics": "info,system",
    "message": "system started"
}
```

#### **Filtragem por Tópicos:**
- `error` - Erros críticos
- `warning` - Avisos
- `info` - Informações gerais
- `system` - Sistema
- `firewall` - Firewall

---

## 📜 Scripts - Funcionalidades Avançadas

### ✅ **Criação e Execução**

#### **Propriedades do Script:**
```javascript
{
    "name": "backup_script",
    "source": ":log info \"Backup iniciado\"\n/system backup save",
    "policy": "read,write,policy,test",
    "owner": "admin",
    "comment": "Script de backup automático"
}
```

#### **Políticas (Policies):**
- `read` - Leitura
- `write` - Escrita
- `policy` - Alterar políticas
- `test` - Executar comandos de teste
- `password` - Alterar senhas
- `sniff` - Packet sniffing
- `sensitive` - Dados sensíveis
- `romon` - RoMON

### 🔧 **Linguagem de Script RouterOS**

#### **Sintaxe Básica:**
```routeros
# Comentário
:log info "Mensagem de log"
:local variavel "valor"
:if ($variavel = "valor") do={
    :log info "Condição verdadeira"
}

# Loop
:foreach item in=[/interface find] do={
    :local name [/interface get $item name]
    :log info $name
}
```

#### **Comandos Úteis:**
```routeros
# Data e hora
[/system clock get date]
[/system clock get time]

# Backup
/system backup save name=("backup-" . [/system clock get date])

# Informações do sistema
[/system resource get cpu-load]
[/system resource get free-memory]
```

---

## ⏰ Schedules - Agendamentos

### ⏲️ **Configuração de Horários**

#### **Formatos Aceitos:**
```javascript
{
    "start-time": "02:00:00",    // HH:MM:SS
    "start-date": "jan/01/2024", // mmm/dd/yyyy
    "interval": "1d",            // 1 dia
    "interval": "01:00:00"       // 1 hora em HH:MM:SS
}
```

#### **Intervalos Comuns:**
- `30s` - 30 segundos (formato: `00:00:30`)
- `1m` - 1 minuto (formato: `00:01:00`)
- `1h` - 1 hora (formato: `01:00:00`)
- `1d` - 1 dia
- `7d` - 1 semana
- `30d` - 1 mês

### 📅 **Execução e Controle**

#### **Estados do Schedule:**
- `disabled=false` - Ativo
- `disabled=true` - Desabilitado
- `next-run` - Próxima execução (calculado automaticamente)

---

## 🔧 Boas Práticas Descobertas

### 🚀 **Performance**

#### **Reutilização de Conexões:**
```javascript
class ServiceBase {
    constructor() {
        this.connections = new Map();
    }
    
    async getConnection(host, user, pass, port) {
        const key = `${host}:${port}`;
        
        if (this.connections.has(key)) {
            try {
                // Testar se ainda está ativa
                await existingConn.write('/system/identity/print');
                return this.connections.get(key);
            } catch {
                this.connections.delete(key);
            }
        }
        
        // Criar nova conexão
        const conn = new RouterOSAPI({...});
        await conn.connect();
        this.connections.set(key, conn);
        return conn;
    }
}
```

#### **Timeout Apropriado:**
- **Conexão**: 10-15 segundos
- **Comandos simples**: 5 segundos
- **Comandos complexos**: 30 segundos
- **Backup/Scripts**: 60+ segundos

### 🛡️ **Tratamento de Erros**

#### **Erros Comuns:**
```javascript
try {
    await conn.write('/comando/inexistente');
} catch (error) {
    // Tipos de erro:
    // - "no such command" - Comando inválido
    // - "invalid property" - Propriedade inválida
    // - "no such item" - ID não encontrado
    // - "connection timeout" - Timeout
}
```

#### **Validações Importantes:**
```javascript
// Verificar se ID existe antes de usar
const users = await conn.write('/ip/hotspot/user/print', [`=.id=${id}`]);
if (users.length === 0) {
    throw new Error('Usuário não encontrado');
}

// Validar formato de IP
const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
if (!ipRegex.test(ip)) {
    throw new Error('IP inválido');
}
```

### 📊 **Logging e Debug**

#### **Log Estruturado:**
```javascript
console.log(`[SERVICE] [${new Date().toISOString()}] Operação: ${operacao}`);
console.log(`[SERVICE] [${new Date().toISOString()}] Parâmetros:`, params);
console.log(`[SERVICE] [${new Date().toISOString()}] Resultado:`, resultado);
```

#### **Informações Úteis para Log:**
- Timestamp ISO
- IP do MikroTik
- Usuário da conexão
- Comando executado
- Número de resultados
- Tempo de execução

---

## 🚨 Problemas Encontrados e Soluções

### ⚠️ **Conexões Órfãs**

#### **Problema:**
Conexões não fechadas consomem recursos no MikroTik

#### **Solução:**
```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
    await service.closeAllConnections();
    process.exit(0);
});

// Timeout automático
setTimeout(() => {
    if (conn && conn.connected) {
        conn.close();
    }
}, 300000); // 5 minutos
```

### 🔄 **Reconexão Automática**

#### **Problema:**
Conexões podem cair por timeout ou reinicialização

#### **Solução:**
```javascript
async function executeWithRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            // Limpar conexão inválida
            this.connections.delete(connectionKey);
            
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

### 📝 **Encoding de Caracteres**

#### **Problema:**
Caracteres especiais em comentários/nomes

#### **Solução:**
```javascript
// Sanitizar entrada
function sanitizeString(str) {
    return str.replace(/[^\w\s-]/g, '').trim();
}

// Validar caracteres permitidos
const validNameRegex = /^[a-zA-Z0-9_-]+$/;
```

---

## 🎓 Lições Aprendidas

### 💡 **Principais Insights**

1. **RouterOS é Poderoso**: API extremamente rica e bem estruturada
2. **Documentação Escassa**: Necessário muito teste e experimentação
3. **Tipos de Dados**: Atenção aos tipos (strings vs numbers)
4. **IDs Dinâmicos**: Sempre usar .id, nunca assumir valores fixos
5. **Performance**: Cache de conexões é essencial
6. **Logs Detalhados**: Facilitam muito o debug
7. **Graceful Handling**: Tratamento de erros robusto é crucial

### 🔧 **Recomendações Técnicas**

1. **Sempre validar entrada** antes de enviar comandos
2. **Implementar retry logic** para comandos críticos
3. **Cache inteligente** de conexões e dados
4. **Logs estruturados** com contexto suficiente
5. **Timeouts apropriados** por tipo de operação
6. **Cleanup automático** de recursos
7. **Testes extensivos** com dados reais

### 📚 **Para Estudos Futuros**

1. **RouterOS Scripting Language** - Sintaxe completa
2. **SNMP Integration** - Monitoramento adicional
3. **Capsman** - Gerenciamento centralizado de APs
4. **Advanced Firewall** - Regras complexas
5. **VPN Protocols** - OpenVPN, IPSec, WireGuard
6. **Load Balancing** - Múltiplas conexões WAN
7. **Quality of Service** - Traffic shaping avançado

---

## 🔗 Recursos Úteis

### 📖 **Documentação**
- [MikroTik Wiki](https://wiki.mikrotik.com/)
- [RouterOS API Documentation](https://wiki.mikrotik.com/wiki/Manual:API)
- [node-routeros GitHub](https://github.com/brandon-7/node-routeros)

### 🛠️ **Ferramentas**
- **WinBox** - Interface oficial (para comparação)
- **RouterOS Terminal** - Linha de comando
- **API Tester** - Ferramenta oficial para testes

### 👥 **Comunidade**
- [MikroTik Forum](https://forum.mikrotik.com/)
- [Reddit r/mikrotik](https://reddit.com/r/mikrotik)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/mikrotik)

---

**📅 Documentado em: 26/06/2024**
**🎯 Status: Conhecimento consolidado e aplicado**
**🚀 Próximo passo: Implementar funcionalidades avançadas baseadas nestes aprendizados**