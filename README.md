# MikroTik API + WireGuard VPS2

API completa para gerenciamento de MikroTik RouterOS com integração WireGuard.

## 🚀 Funcionalidades

- **Gerenciamento completo do MikroTik RouterOS**
- **Integração com WG Easy via Docker**
- **Criação automática de peers WireGuard**
- **Geração de configurações MikroTik**
- **API RESTful completa**

## 📋 Pré-requisitos

- Node.js 16+
- Docker (para WG Easy)
- Acesso ao MikroTik RouterOS

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd mikrotik-api+wireguard-vps2
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Configure o WG Easy (Docker)**
```bash
# Criar diretório para WG Easy
mkdir -p ~/wg-easy

# Executar WG Easy com Docker
docker run -d \
  --name=wg-easy \
  -e WG_HOST=193.181.208.141 \
  -e PASSWORD=your-password \
  -e WG_DEFAULT_ADDRESS=10.8.0.x \
  -e WG_DEFAULT_DNS=1.1.1.1 \
  -e WG_ALLOWED_IPS=0.0.0.0/0 \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  -v ~/.wg-easy:/etc/wireguard \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --sysctl="net.ipv4.ip_forward=1" \
  --restart unless-stopped \
  weejewel/wg-easy
```

5. **Inicie o servidor**
```bash
npm start
# ou para desenvolvimento
npm run dev
```

## 🌐 Endpoints Principais

### Health Check
- `GET /health` - Verificar status do servidor

### WireGuard
- `GET /wireguard/clients` - Listar clientes
- `POST /wireguard/clients` - Criar cliente
- `DELETE /wireguard/clients/:name` - Deletar cliente
- `POST /wireguard/recreate-config` - Recriar configuração

### Teste
- `GET /test/wg-easy/connection` - Testar conexão WG Easy
- `GET /test/wg-easy/clients` - Listar clientes (teste)
- `POST /test/wg-easy/clients` - Criar cliente teste

### MikroTik
- `GET /hotspot/*` - Gerenciamento de hotspot
- `GET /system/*` - Informações do sistema
- `POST /scripts/*` - Gerenciamento de scripts

## 🔐 Configuração WG Easy

1. **Acesse a interface web**: http://IP:51821
2. **Configure a senha** no arquivo .env
3. **Verifique se o Docker está rodando**:
```bash
docker ps | grep wg-easy
```

## 🧪 Teste de Funcionamento

1. **Teste a API**:
```bash
curl http://193.181.208.141:3000/health
```

2. **Teste o WG Easy**:
```bash
curl http://193.181.208.141:3000/test/wg-easy/connection
```

3. **Crie um cliente teste**:
```bash
curl -X POST http://193.181.208.141:3000/test/wg-easy/clients \
  -H "Content-Type: application/json" \
  -d '{"clientName": "teste-123"}'
```

## 📁 Estrutura do Projeto

```
mikrotik-api+wireguard-vps2/
├── app.js                 # Arquivo principal
├── src/
│   ├── controllers/       # Controllers da API
│   ├── services/         # Serviços (WireGuard, etc.)
│   └── middleware/       # Middlewares
├── public/               # Arquivos estáticos
└── package.json          # Dependências
```

## 🐛 Troubleshooting

### WG Easy não está respondendo
```bash
# Verificar se está rodando
docker logs wg-easy

# Reiniciar container
docker restart wg-easy
```

### Erro de conexão
```bash
# Verificar logs da API
npm run dev

# Testar endpoints manualmente
curl http://localhost:3000/health
```

### Firewall
```bash
# Abrir portas necessárias
sudo ufw allow 3000
sudo ufw allow 51820/udp
sudo ufw allow 51821
```

## 📄 Licença

MIT License