const ConnectionManager = require('./src/services/connection-manager');
const HotspotImprovedService = require('./src/services/hotspot-improved');

async function testImprovedConnection() {
    console.log('🧪 TESTE MELHORADO - API MikroTik VPS2');
    console.log('=====================================\n');

    const connectionManager = new ConnectionManager();
    const hotspotService = new HotspotImprovedService();

    // Configurações de teste (ajuste conforme necessário)
    const testConfigs = [
        {
            name: 'Teste de Credenciais Corretas',
            host: '192.168.1.1',
            username: 'admin',
            password: 'admin123',
            port: 8728,
            expectedResult: 'success'
        },
        {
            name: 'Teste de Senha Incorreta',
            host: '192.168.1.1',
            username: 'admin',
            password: 'senha_errada',
            port: 8728,
            expectedResult: 'auth_error'
        },
        {
            name: 'Teste de Host Inexistente',
            host: '192.168.99.99',
            username: 'admin',
            password: 'admin',
            port: 8728,
            expectedResult: 'network_error'
        }
    ];

    for (const config of testConfigs) {
        console.log(`\n🔍 ${config.name}`);
        console.log(`Host: ${config.host}:${config.port} | User: ${config.username}`);
        console.log('─'.repeat(60));

        try {
            const startTime = Date.now();
            const result = await connectionManager.testConnection(
                config.host, 
                config.username, 
                config.password, 
                config.port
            );
            const duration = Date.now() - startTime;

            if (result.success) {
                console.log('✅ SUCESSO');
                console.log(`  Tempo: ${result.connectionTime}ms (Total: ${duration}ms)`);
                console.log(`  MikroTik: ${result.mikrotikInfo?.identity} v${result.mikrotikInfo?.version}`);
                console.log(`  Board: ${result.mikrotikInfo?.board}`);
                console.log(`  Cache: ${result.cacheStatus}`);
                
                if (result.connectionStats) {
                    console.log(`  Estatísticas: ${result.connectionStats.created} criadas, ${result.connectionStats.reused} reutilizadas`);
                }
            } else {
                console.log('❌ FALHA');
                console.log(`  Tempo: ${result.connectionTime}ms (Total: ${duration}ms)`);
                console.log(`  Tipo: ${result.error.type}`);
                console.log(`  Código: ${result.error.code}`);
                console.log(`  Mensagem: ${result.error.message}`);
                console.log(`  Pode tentar novamente: ${result.error.retryable ? 'Sim' : 'Não'}`);
            }

        } catch (error) {
            console.log('💥 ERRO CRÍTICO');
            console.log(`  Tipo: ${error.type || 'UNKNOWN'}`);
            console.log(`  Código: ${error.code || 'UNKNOWN'}`);
            console.log(`  Mensagem: ${error.message}`);
            console.log(`  Status HTTP: ${error.statusCode || 'N/A'}`);
            
            if (error.userMessage) {
                console.log(`  Mensagem ao usuário: ${error.userMessage}`);
            }
        }
    }

    // Teste de reutilização de conexão
    console.log('\n\n🔄 TESTE DE REUTILIZAÇÃO DE CONEXÃO');
    console.log('===================================');
    
    const host = '192.168.1.1';
    const username = 'admin';
    const password = 'admin123';

    try {
        console.log('\n1. Primeira conexão (deve criar nova)');
        const result1 = await connectionManager.testConnection(host, username, password);
        console.log(`Cache status: ${result1.success ? result1.cacheStatus : 'Failed'}`);

        console.log('\n2. Segunda conexão (deve reutilizar)');
        const result2 = await connectionManager.testConnection(host, username, password);
        console.log(`Cache status: ${result2.success ? result2.cacheStatus : 'Failed'}`);

    } catch (error) {
        console.log(`Erro no teste de reutilização: ${error.message}`);
    }

    // Estatísticas finais
    console.log('\n\n📊 ESTATÍSTICAS FINAIS');
    console.log('=====================');
    const stats = connectionManager.getStats();
    console.log(`Conexões ativas: ${stats.activeConnections}`);
    console.log(`Total criadas: ${stats.totalStats.created}`);
    console.log(`Total reutilizadas: ${stats.totalStats.reused}`);
    console.log(`Total falharam: ${stats.totalStats.failed}`);
    console.log(`Taxa de acerto do cache: ${stats.cacheHitRate}`);
    console.log(`Uptime: ${Math.round(stats.uptime)}s`);

    // Limpeza
    console.log('\n🧹 Fechando todas as conexões...');
    await connectionManager.closeAllConnections();
    console.log('✅ Conexões fechadas com sucesso');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    testImprovedConnection()
        .then(() => {
            console.log('\n✅ Teste concluído com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Erro durante o teste:', error);
            process.exit(1);
        });
}

module.exports = { testImprovedConnection }; 