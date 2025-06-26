# MikroTik API

Uma API completa e moderna para gerenciamento de MikroTik RouterOS com interface web integrada.

## 📋 Recursos Principais

### 🔥 Hotspot
- ✅ CRUD completo de usuários (criar, listar, editar, excluir)
- ✅ Gerenciamento de profiles (velocidades, limites, timeouts)
- ✅ Visualização de usuários ativos em tempo real
- ✅ Desconexão de usuários ativos
- ✅ Gerenciamento de servidores hotspot
- ✅ Controle de cookies
- ✅ Estatísticas detalhadas

### 🖥️ Sistema
- ✅ Informações completas do sistema (identidade, recursos, relógio)
- ✅ Gerenciamento de logs (visualizar, limpar)
- ✅ Usuários do sistema
- ✅ Interfaces de rede e estatísticas
- ✅ Endereços IP e rotas
- ✅ Backup e restore
- ✅ Controle de sistema (reboot, shutdown)

### 📜 Scripts
- ✅ CRUD completo de scripts
- ✅ Execução de scripts por ID ou nome
- ✅ Gerenciamento de variáveis de ambiente
- ✅ Controle de jobs (processos em execução)
- ✅ Templates pré-definidos (backup, monitoramento, etc.)
- ✅ Estatísticas de execução

### ⏰ Agendamentos (Schedules)
- ✅ CRUD completo de agendamentos
- ✅ Controle de habilitação/desabilitação
- ✅ Templates de agendamentos comuns
- ✅ Validação de horários e intervalos
- ✅ Operações em lote
- ✅ Estatísticas de execução

### 🌐 Interface Web
- ✅ Interface moderna e responsiva
- ✅ Teste de conexão em tempo real
- ✅ Visualização organizada por seções
- ✅ Formulários para criação/edição
- ✅ Tabelas interativas
- ✅ Feedback visual de operações

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ 
- npm 8+
- MikroTik RouterOS com API habilitada

### Configuração

1. **Clone ou baixe o projeto**
```bash
cd mikrotik-api
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o MikroTik**
Certifique-se de que a API está habilitada no MikroTik:
```
/ip service enable api
/ip service set api port=8728
```

4. **Inicie a aplicação**
```bash
# Produção
npm start

# Desenvolvimento (com auto-reload)
npm run dev
```

5. **Acesse a interface**
Abra seu navegador em: `http://localhost:3000`

## 📖 Uso da API

### Autenticação
Todas as rotas requerem parâmetros de conexão via query string:
- `ip`: Endereço IP do MikroTik
- `username`: Usuário do MikroTik
- `password`: Senha do usuário
- `port`: Porta da API (opcional, padrão: 8728)

### Exemplos de Uso

#### Teste de Conexão
```bash
curl -X POST "http://localhost:3000/test-connection?ip=192.168.1.1&username=admin&password=senha123"
```

#### Listar Usuários do Hotspot
```bash
curl "http://localhost:3000/hotspot/users?ip=192.168.1.1&username=admin&password=senha123"
```

#### Criar Usuário
```bash
curl -X POST "http://localhost:3000/hotspot/users?ip=192.168.1.1&username=admin&password=senha123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "usuario_teste",
    "password": "123456",
    "profile": "1M",
    "comment": "Usuário de teste"
  }'
```

#### Executar Script
```bash
curl -X POST "http://localhost:3000/scripts/run?ip=192.168.1.1&username=admin&password=senha123&id=*1"
```

## 🛠️ Estrutura do Projeto

```
mikrotik-api/
├── app.js                          # Aplicação principal
├── package.json                    # Dependências e scripts
├── README.md                       # Documentação
├── public/                         # Interface web
│   ├── index.html                  # Página principal
│   ├── css/style.css              # Estilos customizados
│   └── js/app.js                  # JavaScript da interface
└── src/
    ├── controllers/               # Controladores da API
    │   ├── hotspot.js            # Controller do hotspot
    │   ├── system.js             # Controller do sistema
    │   ├── scripts.js            # Controller de scripts
    │   └── schedules.js          # Controller de agendamentos
    ├── services/                  # Lógica de negócio
    │   ├── hotspot.js            # Serviços do hotspot
    │   ├── system.js             # Serviços do sistema
    │   ├── scripts.js            # Serviços de scripts
    │   └── schedules.js          # Serviços de agendamentos
    └── middleware/               # Middlewares
        └── validation.js         # Validações e sanitização
```

## 📊 Funcionalidades Detalhadas

### Hotspot

#### Usuários
- **GET** `/hotspot/users` - Listar usuários
- **POST** `/hotspot/users` - Criar usuário
- **PUT** `/hotspot/users?id=X` - Atualizar usuário
- **DELETE** `/hotspot/users?id=X` - Excluir usuário

#### Profiles
- **GET** `/hotspot/profiles` - Listar profiles
- **POST** `/hotspot/profiles` - Criar profile
- **PUT** `/hotspot/profiles?id=X` - Atualizar profile
- **DELETE** `/hotspot/profiles?id=X` - Excluir profile

#### Usuários Ativos
- **GET** `/hotspot/active-users` - Listar usuários conectados
- **POST** `/hotspot/disconnect?id=X` - Desconectar usuário

### Sistema

#### Informações
- **GET** `/system/info` - Informações completas
- **GET** `/system/resource` - Recursos do sistema
- **GET** `/system/interfaces` - Interfaces de rede

#### Logs
- **GET** `/system/logs` - Visualizar logs
- **DELETE** `/system/logs` - Limpar logs

#### Backup
- **POST** `/system/backup` - Criar backup
- **GET** `/system/backups` - Listar backups

### Scripts

#### Gerenciamento
- **GET** `/scripts` - Listar scripts
- **POST** `/scripts` - Criar script
- **POST** `/scripts/run?id=X` - Executar script

#### Templates
- **GET** `/scripts/templates` - Listar templates
- **POST** `/scripts/from-template` - Criar do template

### Agendamentos

#### Gerenciamento
- **GET** `/schedules` - Listar agendamentos
- **POST** `/schedules` - Criar agendamento
- **POST** `/schedules/enable?id=X` - Habilitar
- **POST** `/schedules/disable?id=X` - Desabilitar

## 🔒 Segurança

### Validações Implementadas
- ✅ Validação de formato de IP
- ✅ Sanitização de entrada
- ✅ Rate limiting (100 req/min por IP)
- ✅ Validação de parâmetros obrigatórios
- ✅ Timeout de conexão configurável

### Logs Detalhados
- ✅ Timestamp em todas as operações
- ✅ Log de todas as requisições
- ✅ Log detalhado de erros
- ✅ Identificação por serviço

## 🎨 Interface Web

### Características
- ✅ Design responsivo (mobile-friendly)
- ✅ Bootstrap 5 + Font Awesome
- ✅ Navegação por abas
- ✅ Formulários modais
- ✅ Feedback visual de operações
- ✅ Tabelas interativas

### Seções da Interface
1. **Conexão** - Configuração e teste de conexão
2. **Hotspot** - Usuários, profiles, ativos, estatísticas
3. **Sistema** - Informações, logs, recursos
4. **Scripts** - Gerenciamento e execução
5. **Agendamentos** - Criação e controle

## ⚡ Templates Incluídos

### Scripts
- **Basic Log** - Log básico com timestamp
- **Backup Script** - Backup automático
- **Interface Monitor** - Monitoramento de interfaces
- **User Cleanup** - Limpeza de usuários inativos
- **System Health** - Verificação de saúde
- **Firewall Stats** - Estatísticas do firewall

### Agendamentos
- **Daily Backup** - Backup diário (02:00)
- **Weekly Cleanup** - Limpeza semanal (03:00)
- **Hourly Stats** - Estatísticas horárias
- **Monthly Report** - Relatório mensal
- **Interface Monitor** - Monitor a cada 5min
- **System Reboot** - Reinicialização semanal

## 🚨 Tratamento de Erros

### API
- ✅ Respostas padronizadas JSON
- ✅ Códigos HTTP apropriados
- ✅ Mensagens de erro descritivas
- ✅ Timestamp em todas as respostas

### Interface
- ✅ Alertas visuais
- ✅ Indicadores de carregamento
- ✅ Mensagens de sucesso/erro
- ✅ Modal de respostas da API

## 📈 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
Todos os logs incluem:
- Timestamp ISO
- Identificação do serviço
- Detalhes da operação
- IP do cliente

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- 📧 Email: suporte@mikrotik-api.com
- 🐛 Issues: GitHub Issues
- 📚 Docs: Este README

---

**Desenvolvido com ❤️ para a comunidade MikroTik**