const HotspotService = require('../services/hotspot');

class UserAuthController {
    constructor() {
        this.hotspotService = new HotspotService();
    }

    // Endpoint para verificar autenticação do usuário e atualizar comentário
    async checkUserAuth(req, res) {
        try {
            const { username, password } = req.body;
            const { ip, username: mikrotikUser, password: mikrotikPass, port } = req.query;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username e password são obrigatórios'
                });
            }

            if (!ip || !mikrotikUser || !mikrotikPass) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, username, password)'
                });
            }

            console.log(`[USER-AUTH] [${new Date().toISOString()}] Verificando autenticação do usuário: ${username}`);

            // Buscar o usuário no MikroTik
            const users = await this.hotspotService.listUsers(ip, mikrotikUser, mikrotikPass, parseInt(port) || 8728);
            const user = users.find(u => u.name === username);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            // Verificar se a senha está correta
            if (user.password !== password) {
                return res.status(401).json({
                    success: false,
                    error: 'Senha incorreta'
                });
            }

            // Verificar se o comentário contém valor e não contém "Expira"
            if (user.comment && user.comment.includes('Valor:') && !user.comment.includes('Expira:')) {
                console.log(`[USER-AUTH] [${new Date().toISOString()}] Atualizando comentário do usuário: ${username}`);
                
                // Calcular data de expiração baseada no session-timeout do profile
                const expirationDate = await this.calculateExpirationDate(ip, mikrotikUser, mikrotikPass, user.profile, parseInt(port) || 8728);
                
                // Atualizar comentário com data de expiração
                const updatedComment = user.comment + ` - Expira: ${expirationDate}`;
                
                await this.hotspotService.updateUser(ip, mikrotikUser, mikrotikPass, user['.id'], {
                    comment: updatedComment
                }, parseInt(port) || 8728);

                return res.json({
                    success: true,
                    message: 'Usuário autenticado e comentário atualizado com sucesso',
                    data: {
                        username: user.name,
                        profile: user.profile,
                        comment: updatedComment,
                        expires_at: expirationDate
                    }
                });
            }

            return res.json({
                success: true,
                message: 'Usuário autenticado com sucesso',
                data: {
                    username: user.name,
                    profile: user.profile,
                    comment: user.comment
                }
            });

        } catch (error) {
            console.error(`[USER-AUTH] [${new Date().toISOString()}] Erro ao verificar autenticação:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Calcular data de expiração baseada no session-timeout do profile
    async calculateExpirationDate(ip, mikrotikUser, mikrotikPass, profileName, port = 8728) {
        try {
            // Buscar informações do profile
            const profiles = await this.hotspotService.listProfiles(ip, mikrotikUser, mikrotikPass, port);
            const profile = profiles.find(p => p.name === profileName);

            if (!profile || !profile['session-timeout']) {
                return 'Sem limite';
            }

            const sessionTimeout = profile['session-timeout'];
            const now = new Date();
            
            // Aplicar timezone de Manaus (UTC-4)
            now.setHours(now.getHours() - 4);

            // Calcular segundos de duração
            let durationSeconds = 0;
            if (sessionTimeout.includes('h')) {
                const hours = parseInt(sessionTimeout.replace('h', ''));
                durationSeconds = hours * 3600;
            } else if (sessionTimeout.includes('m')) {
                const minutes = parseInt(sessionTimeout.replace('m', ''));
                durationSeconds = minutes * 60;
            } else if (sessionTimeout.includes(':')) {
                const parts = sessionTimeout.split(':');
                durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            } else {
                durationSeconds = parseInt(sessionTimeout);
            }

            // Calcular data de expiração
            const expirationDate = new Date(now);
            expirationDate.setSeconds(expirationDate.getSeconds() + durationSeconds);

            return expirationDate.toISOString().replace('T', ' ').split('.')[0];

        } catch (error) {
            console.error(`[USER-AUTH] [${new Date().toISOString()}] Erro ao calcular data de expiração:`, error.message);
            return 'Erro ao calcular';
        }
    }

    // Endpoint para webhook de autenticação (pode ser chamado pelo MikroTik)
    async handleAuthWebhook(req, res) {
        try {
            const { 
                username, 
                password, 
                'mac-address': macAddress, 
                'ip-address': ipAddress,
                status 
            } = req.body;

            console.log(`[USER-AUTH-WEBHOOK] [${new Date().toISOString()}] Webhook recebido:`, {
                username,
                macAddress,
                ipAddress,
                status
            });

            // Se o status é "login" (usuário se autenticou), atualizar comentário
            if (status === 'login' && username && password) {
                // Aqui você pode implementar lógica para identificar qual MikroTik
                // está enviando o webhook e atualizar o comentário
                
                // Por enquanto, vamos apenas logar
                console.log(`[USER-AUTH-WEBHOOK] [${new Date().toISOString()}] Usuário ${username} fez login`);
            }

            res.json({
                success: true,
                message: 'Webhook processado com sucesso'
            });

        } catch (error) {
            console.error(`[USER-AUTH-WEBHOOK] [${new Date().toISOString()}] Erro ao processar webhook:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = UserAuthController;