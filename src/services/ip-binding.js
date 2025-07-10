const { RouterOSAPI } = require('node-routeros');
const { getConnection, enhanceError, parseDuration } = require('./connection-manager');

// Função para formatar a duração em um formato legível
function formatDuration(sessionTimeout) {
    if (!sessionTimeout) {
        return 'Sem limite';
    }

    const duration = parseDuration(sessionTimeout);
    if (duration.asSeconds() === 0) {
        return 'Sem limite';
    }
    if (duration.asDays() >= 1) {
        const days = Math.floor(duration.asDays());
        return `${days} dia(s)`;
    }
    if (duration.asHours() >= 1) {
        const hours = Math.floor(duration.asHours());
        return `${hours} hora(s)`;
    }
    const minutes = Math.floor(duration.asMinutes());
    return `${minutes} min`;
}

class IpBindingService {
    // ... (métodos existentes: list, getById, etc)

    async create(host, username, password, bindingData, port = 8728) {
        // ... (código existente sem alterações)
    }

    async createFromPayment(host, username, password, paymentData, port = 8728) {
        try {
            const conn = await getConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] Criando IP binding para MAC: ${paymentData.mac_address}`);

            // Normalizar MAC Address
            const macAddress = paymentData.mac_address.toUpperCase().replace(/[:-]/g, '');
            const formattedMac = macAddress.match(/.{1,2}/g).join(':');

            // Calcular expiração
            const now = new Date();
            let expiresAt = null;
            let sessionTimeoutSeconds = 0;
            if (paymentData.plano_session_timeout) {
                 const duration = parseDuration(paymentData.plano_session_timeout);
                 sessionTimeoutSeconds = duration.asSeconds();
                 if (sessionTimeoutSeconds > 0) {
                    expiresAt = new Date(now.getTime() + sessionTimeoutSeconds * 1000);
                 }
            }
            
            // Formatando o comentário
            const createdAtStr = now.toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
            const expiresAtStr = expiresAt ? expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Manaus' }) : 'Nunca';
            const durationText = formatDuration(paymentData.plano_session_timeout);
            
            const comment = `PIX-${paymentData.payment_id} | Plano: ${paymentData.plano_nome} | Valor: R$ ${parseFloat(paymentData.plano_valor).toFixed(2)} | Duração: ${durationText} | Criado: ${createdAtStr} | Expira: ${expiresAtStr}`;

            // Deletar IP binding existente com o mesmo MAC para evitar conflitos
            try {
                const existingBindings = await this.findByMac(host, username, password, formattedMac, port);
                for (const binding of existingBindings) {
                    console.log(`[IP-BINDING-SERVICE] Removendo IP binding antigo ID: ${binding['.id']}`);
                    await this.delete(host, username, password, binding['.id'], port);
                }
            } catch (error) {
                 console.warn('[IP-BINDING-SERVICE] Aviso ao remover binding antigo:', error.message);
            }

            const params = [
                `=mac-address=${formattedMac}`,
                `=type=bypassed`,
                `=comment=${comment}`,
                `=server=all`
            ];

            const result = await conn.write('/ip/hotspot/ip-binding/add', params);
            console.log(`[IP-BINDING-SERVICE] IP binding criado com sucesso para: ${formattedMac}`);
            
            return {
                success: true,
                mac_address: formattedMac,
                type: 'bypassed',
                comment: comment,
                created_at: now.toISOString(),
                expires_at: expiresAt ? expiresAt.toISOString() : null,
                session_timeout_seconds: sessionTimeoutSeconds,
                result: result
            };

        } catch (error) {
            console.error('[IP-BINDING-SERVICE] Erro ao criar IP binding a partir de pagamento:', error.message);
            throw enhanceError(error, 'createFromPayment', { host, port, mac: paymentData.mac_address });
        }
    }
    
    // ... (outros métodos: update, delete, etc)
}

module.exports = new IpBindingService(); 