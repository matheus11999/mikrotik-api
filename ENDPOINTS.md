# 📋 MikroTik API - Documentação Completa das Endpoints

## 🔗 URL Base
```
http://localhost:3000
```

## 🔐 Autenticação
Todas as endpoints requerem os seguintes parâmetros via query string:
- `ip` - Endereço IP do MikroTik (obrigatório)
- `username` - Usuário do MikroTik (obrigatório) 
- `password` - Senha do usuário (obrigatório)
- `port` - Porta da API (opcional, padrão: 8728)

**Exemplo:**
```
?ip=192.168.1.1&username=admin&password=senha123&port=8728
```

---

## 🏥 Health Check & Conexão

### GET /health
Verificação de saúde da API
```bash
curl http://localhost:3000/health
```
**Resposta:**
```json
{
  "status": "OK",
  "service": "MikroTik API", 
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### POST /test-connection
Testa conexão com o MikroTik
```bash
curl -X POST "http://localhost:3000/test-connection?ip=192.168.1.1&username=admin&password=senha123"
```
**Resposta:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Conexão testada com sucesso",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "message": "Conexão testada com sucesso",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔥 Hotspot

### 👥 Usuários

#### GET /hotspot/users
Lista todos os usuários do hotspot
```bash
curl "http://localhost:3000/hotspot/users?ip=192.168.1.1&username=admin&password=senha123"
```
**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      ".id": "*1",
      "name": "user1",
      "password": "123456",
      "profile": "1M",
      "server": "hotspot1",
      "disabled": "false",
      "comment": "Usuário teste"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /hotspot/users
Cria um novo usuário
```bash
curl -X POST "http://localhost:3000/hotspot/users?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "usuario_novo",
    "password": "123456",
    "profile": "1M",
    "comment": "Novo usuário",
    "server": "hotspot1",
    "disabled": false
  }'
```

#### PUT /hotspot/users?id=*1
Atualiza um usuário existente
```bash
curl -X PUT "http://localhost:3000/hotspot/users?ip=192.168.1.1&username=admin&password=senha123&id=*1" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "nova_senha",
    "profile": "2M",
    "comment": "Usuário atualizado"
  }'
```

#### DELETE /hotspot/users?id=*1
Remove um usuário
```bash
curl -X DELETE "http://localhost:3000/hotspot/users?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### GET /hotspot/users/details?id=*1
Busca usuário por ID
```bash
curl "http://localhost:3000/hotspot/users/details?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

### 👨‍💼 Usuários Ativos

#### GET /hotspot/active-users
Lista usuários conectados atualmente
```bash
curl "http://localhost:3000/hotspot/active-users?ip=192.168.1.1&username=admin&password=senha123"
```
**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      ".id": "*1",
      "user": "user1",
      "address": "192.168.1.100",
      "mac-address": "AA:BB:CC:DD:EE:FF",
      "uptime": "00:15:30",
      "bytes-in": "1024000",
      "bytes-out": "512000"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /hotspot/disconnect?id=*1
Desconecta um usuário ativo
```bash
curl -X POST "http://localhost:3000/hotspot/disconnect?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

### 📊 Profiles

#### GET /hotspot/profiles
Lista todos os profiles
```bash
curl "http://localhost:3000/hotspot/profiles?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /hotspot/profiles
Cria um novo profile
```bash
curl -X POST "http://localhost:3000/hotspot/profiles?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "profile_2M",
    "rate_limit": "2M/2M",
    "session_timeout": "01:00:00",
    "idle_timeout": "00:10:00"
  }'
```

#### PUT /hotspot/profiles?id=*1
Atualiza um profile
```bash
curl -X PUT "http://localhost:3000/hotspot/profiles?ip=192.168.1.1&username=admin&password=senha123&id=*1" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limit": "5M/5M",
    "session_timeout": "02:00:00"
  }'
```

#### DELETE /hotspot/profiles?id=*1
Remove um profile
```bash
curl -X DELETE "http://localhost:3000/hotspot/profiles?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

### 🖥️ Servidores & Outros

#### GET /hotspot/servers
Lista servidores hotspot
```bash
curl "http://localhost:3000/hotspot/servers?ip=192.168.1.1&username=admin&password=senha123"
```

#### GET /hotspot/cookies
Lista cookies do hotspot
```bash
curl "http://localhost:3000/hotspot/cookies?ip=192.168.1.1&username=admin&password=senha123"
```

#### DELETE /hotspot/cookies?id=*1
Remove um cookie
```bash
curl -X DELETE "http://localhost:3000/hotspot/cookies?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### GET /hotspot/stats
Estatísticas completas do hotspot
```bash
curl "http://localhost:3000/hotspot/stats?ip=192.168.1.1&username=admin&password=senha123"
```
**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_users": 10,
    "active_users": 5,
    "total_profiles": 3,
    "total_servers": 1,
    "users_by_profile": {
      "1M": 5,
      "2M": 3,
      "5M": 2
    },
    "active_users_by_server": {
      "hotspot1": 5
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🖥️ Sistema

### 📊 Informações

#### GET /system/info
Informações completas do sistema
```bash
curl "http://localhost:3000/system/info?ip=192.168.1.1&username=admin&password=senha123"
```
**Resposta:**
```json
{
  "success": true,
  "data": {
    "identity": {
      "name": "MikroTik"
    },
    "resource": {
      "uptime": "1w2d03:04:05",
      "version": "7.13.2",
      "build-time": "Dec/18/2023 09:02:52",
      "factory-software": "7.13.2",
      "free-memory": "134217728",
      "total-memory": "268435456",
      "cpu": "MIPS",
      "cpu-count": "1",
      "cpu-frequency": "650",
      "cpu-load": "5",
      "free-hdd-space": "103809024",
      "total-hdd-space": "134217728",
      "write-sect-since-reboot": "1234",
      "write-sect-total": "5678",
      "bad-blocks": "0"
    },
    "clock": {
      "time": "10:30:00",
      "date": "jan/01/2024",
      "time-zone-name": "America/Sao_Paulo"
    },
    "routerboard": {
      "routerboard": "true",
      "board-name": "RB951G-2HnD",
      "model": "RouterBOARD 951G-2HnD"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /system/identity
Obtém identidade do sistema
```bash
curl "http://localhost:3000/system/identity?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /system/identity
Define identidade do sistema
```bash
curl -X POST "http://localhost:3000/system/identity?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{"name": "MeuMikroTik"}'
```

#### GET /system/resource
Recursos do sistema
```bash
curl "http://localhost:3000/system/resource?ip=192.168.1.1&username=admin&password=senha123"
```

#### GET /system/clock
Relógio do sistema
```bash
curl "http://localhost:3000/system/clock?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /system/clock
Configura relógio
```bash
curl -X POST "http://localhost:3000/system/clock?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "time_zone_name": "America/Sao_Paulo",
    "time_zone_autodetect": false
  }'
```

### 📝 Logs

#### GET /system/logs
Lista logs do sistema
```bash
curl "http://localhost:3000/system/logs?ip=192.168.1.1&username=admin&password=senha123&count=50"
```
**Parâmetros opcionais:**
- `count` - Número de logs (padrão: todos)
- `topics` - Filtrar por tópicos (ex: "error,warning")
- `message` - Filtrar por mensagem

#### DELETE /system/logs
Limpa todos os logs
```bash
curl -X DELETE "http://localhost:3000/system/logs?ip=192.168.1.1&username=admin&password=senha123"
```

### 👤 Usuários do Sistema

#### GET /system/users
Lista usuários do sistema
```bash
curl "http://localhost:3000/system/users?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /system/users
Cria usuário do sistema
```bash
curl -X POST "http://localhost:3000/system/users?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "novo_admin",
    "password": "senha_forte",
    "group": "full",
    "comment": "Novo administrador"
  }'
```

### 🌐 Interfaces

#### GET /system/interfaces
Lista interfaces de rede
```bash
curl "http://localhost:3000/system/interfaces?ip=192.168.1.1&username=admin&password=senha123"
```

#### GET /system/interfaces/stats?interface=ether1
Estatísticas de uma interface
```bash
curl "http://localhost:3000/system/interfaces/stats?ip=192.168.1.1&username=admin&password=senha123&interface=ether1"
```

### 🌍 Rede

#### GET /system/ip-addresses
Lista endereços IP
```bash
curl "http://localhost:3000/system/ip-addresses?ip=192.168.1.1&username=admin&password=senha123"
```

#### GET /system/routes
Lista rotas
```bash
curl "http://localhost:3000/system/routes?ip=192.168.1.1&username=admin&password=senha123"
```

### 💾 Backup

#### POST /system/backup
Cria backup
```bash
curl -X POST "http://localhost:3000/system/backup?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{"name": "backup-20240101"}'
```

#### GET /system/backups
Lista backups
```bash
curl "http://localhost:3000/system/backups?ip=192.168.1.1&username=admin&password=senha123"
```

### 🔄 Controle

#### POST /system/reboot
Reinicia o sistema
```bash
curl -X POST "http://localhost:3000/system/reboot?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /system/shutdown
Desliga o sistema
```bash
curl -X POST "http://localhost:3000/system/shutdown?ip=192.168.1.1&username=admin&password=senha123"
```

#### GET /system/complete-stats
Estatísticas completas
```bash
curl "http://localhost:3000/system/complete-stats?ip=192.168.1.1&username=admin&password=senha123"
```

---

## 📜 Scripts

### 📋 CRUD Básico

#### GET /scripts
Lista todos os scripts
```bash
curl "http://localhost:3000/scripts?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /scripts
Cria um novo script
```bash
curl -X POST "http://localhost:3000/scripts?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backup_script",
    "source": ":log info \"Executando backup\"\n/system backup save name=\"backup-auto\"",
    "comment": "Script de backup automático",
    "policy": "read,write,policy,test"
  }'
```

#### PUT /scripts?id=*1
Atualiza um script
```bash
curl -X PUT "http://localhost:3000/scripts?ip=192.168.1.1&username=admin&password=senha123&id=*1" \
  -H "Content-Type: application/json" \
  -d '{
    "source": ":log info \"Backup atualizado\"\n/system backup save name=\"backup-novo\"",
    "comment": "Script atualizado"
  }'
```

#### DELETE /scripts?id=*1
Remove um script
```bash
curl -X DELETE "http://localhost:3000/scripts?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### GET /scripts/details?id=*1
Busca script por ID
```bash
curl "http://localhost:3000/scripts/details?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

### ▶️ Execução

#### POST /scripts/run?id=*1
Executa script por ID
```bash
curl -X POST "http://localhost:3000/scripts/run?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### POST /scripts/run?name=backup_script
Executa script por nome
```bash
curl -X POST "http://localhost:3000/scripts/run?ip=192.168.1.1&username=admin&password=senha123&name=backup_script"
```

### 🌍 Environment

#### GET /scripts/environment
Lista variáveis de ambiente
```bash
curl "http://localhost:3000/scripts/environment?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /scripts/environment
Define variável de ambiente
```bash
curl -X POST "http://localhost:3000/scripts/environment?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BACKUP_PATH", 
    "value": "/backup/"
  }'
```

#### DELETE /scripts/environment?name=BACKUP_PATH
Remove variável de ambiente
```bash
curl -X DELETE "http://localhost:3000/scripts/environment?ip=192.168.1.1&username=admin&password=senha123&name=BACKUP_PATH"
```

### 🏃 Jobs

#### GET /scripts/jobs
Lista jobs em execução
```bash
curl "http://localhost:3000/scripts/jobs?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /scripts/jobs/stop?id=*1
Para um job
```bash
curl -X POST "http://localhost:3000/scripts/jobs/stop?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

### 📄 Templates

#### GET /scripts/templates
Lista templates disponíveis
```bash
curl "http://localhost:3000/scripts/templates"
```
**Resposta:**
```json
{
  "success": true,
  "data": {
    "basic_log": {
      "name": "Basic Log Script",
      "description": "Script básico para logging",
      "source": ":log info \"Script executado em $(date)\""
    },
    "backup_script": {
      "name": "Backup Script", 
      "description": "Script para criar backup automático",
      "source": ":log info \"Iniciando backup automático\"\n/system backup save name=(\"backup-\" . [/system clock get date] . \"-\" . [/system clock get time])\n:log info \"Backup concluído\""
    }
  },
  "count": 6,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /scripts/from-template
Cria script a partir de template
```bash
curl -X POST "http://localhost:3000/scripts/from-template?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "backup_script",
    "scriptName": "meu_backup_diario"
  }'
```

### 📊 Estatísticas

#### GET /scripts/stats
Estatísticas dos scripts
```bash
curl "http://localhost:3000/scripts/stats?ip=192.168.1.1&username=admin&password=senha123"
```

---

## ⏰ Schedules (Agendamentos)

### 📋 CRUD Básico

#### GET /schedules
Lista todos os agendamentos
```bash
curl "http://localhost:3000/schedules?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /schedules
Cria um novo agendamento
```bash
curl -X POST "http://localhost:3000/schedules?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backup_diario",
    "on_event": "/system backup save name=\"backup-diario\"",
    "start_time": "02:00:00",
    "interval": "1d",
    "comment": "Backup automático diário"
  }'
```

#### PUT /schedules?id=*1
Atualiza um agendamento
```bash
curl -X PUT "http://localhost:3000/schedules?ip=192.168.1.1&username=admin&password=senha123&id=*1" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "03:00:00",
    "interval": "2d",
    "comment": "Backup a cada 2 dias"
  }'
```

#### DELETE /schedules?id=*1
Remove um agendamento
```bash
curl -X DELETE "http://localhost:3000/schedules?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### GET /schedules/details?id=*1
Busca agendamento por ID
```bash
curl "http://localhost:3000/schedules/details?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

### 🎛️ Controle

#### POST /schedules/enable?id=*1
Habilita um agendamento
```bash
curl -X POST "http://localhost:3000/schedules/enable?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### POST /schedules/disable?id=*1
Desabilita um agendamento
```bash
curl -X POST "http://localhost:3000/schedules/disable?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

#### POST /schedules/enable-all
Habilita todos os agendamentos
```bash
curl -X POST "http://localhost:3000/schedules/enable-all?ip=192.168.1.1&username=admin&password=senha123"
```

#### POST /schedules/disable-all
Desabilita todos os agendamentos
```bash
curl -X POST "http://localhost:3000/schedules/disable-all?ip=192.168.1.1&username=admin&password=senha123"
```

### 📄 Templates

#### GET /schedules/templates
Lista templates de agendamentos
```bash
curl "http://localhost:3000/schedules/templates"
```

#### POST /schedules/from-template
Cria agendamento a partir de template
```bash
curl -X POST "http://localhost:3000/schedules/from-template?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "daily_backup",
    "scheduleName": "meu_backup_personalizado",
    "customOptions": {
      "start_time": "04:00:00",
      "interval": "1d"
    }
  }'
```

### 🕐 Utilitários de Tempo

#### GET /schedules/time-options
Opções de tempo disponíveis
```bash
curl "http://localhost:3000/schedules/time-options"
```

#### GET /schedules/validate-time?time=02:00:00&interval=1d
Valida formato de tempo/intervalo
```bash
curl "http://localhost:3000/schedules/validate-time?time=02:00:00&interval=1d"
```

### 📊 Estatísticas

#### GET /schedules/stats
Estatísticas dos agendamentos
```bash
curl "http://localhost:3000/schedules/stats?ip=192.168.1.1&username=admin&password=senha123"
```

---

## 🚨 Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | OK - Operação bem-sucedida |
| 400 | Bad Request - Parâmetros inválidos |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

## 📊 Estrutura de Resposta Padrão

### Sucesso
```json
{
  "success": true,
  "data": { /* dados da resposta */ },
  "message": "Operação realizada com sucesso",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Erro
```json
{
  "success": false,
  "error": "Descrição do erro",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 Rate Limiting
- **Limite**: 100 requisições por minuto por IP
- **Window**: 60 segundos
- **Header de resposta**: Inclui informações sobre rate limiting

## 📝 Notas Importantes

1. **Timeouts**: Conexões têm timeout de 10 segundos
2. **Logs**: Todas as operações são logadas com timestamp
3. **Validação**: Entrada é validada e sanitizada
4. **Conexões**: Reutilizadas quando possível para melhor performance
5. **Encoding**: UTF-8 suportado em todos os campos de texto

---

**📚 Para mais informações, consulte o README.md principal**