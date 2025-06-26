const { RouterOSAPI } = require('node-routeros');

class SchedulesService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
                    this.connections.delete(connectionKey);
                }
            }

            const conn = new RouterOSAPI({
                host: host,
                user: username,
                password: password,
                port: port,
                timeout: 10000
            });

            await conn.connect();
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== SCHEDULES ====================
    
    async listSchedules(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Listando schedules para ${host}`);
            
            const schedules = await conn.write('/system/scheduler/print');
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Encontrados ${schedules.length} schedules`);
            
            return schedules;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao listar schedules:`, error.message);
            throw error;
        }
    }

    async createSchedule(host, username, password, scheduleData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Criando schedule: ${scheduleData.name}`);
            
            const params = [
                `=name=${scheduleData.name}`,
                `=on-event=${scheduleData.on_event || ''}`
            ];
            
            if (scheduleData.start_date) params.push(`=start-date=${scheduleData.start_date}`);
            if (scheduleData.start_time) params.push(`=start-time=${scheduleData.start_time}`);
            if (scheduleData.interval) params.push(`=interval=${scheduleData.interval}`);
            if (scheduleData.count) params.push(`=count=${scheduleData.count}`);
            if (scheduleData.comment) params.push(`=comment=${scheduleData.comment}`);
            if (scheduleData.disabled !== undefined) params.push(`=disabled=${scheduleData.disabled}`);
            if (scheduleData.policy) params.push(`=policy=${scheduleData.policy}`);
            if (scheduleData.owner) params.push(`=owner=${scheduleData.owner}`);
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Parâmetros do schedule:`, params.map(p => p.includes('on-event=') ? p.substring(0, 50) + '...' : p));
            
            const result = await conn.write('/system/scheduler/add', params);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Schedule criado com sucesso: ${scheduleData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao criar schedule:`, error.message);
            throw error;
        }
    }

    async updateSchedule(host, username, password, scheduleId, scheduleData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Atualizando schedule ID: ${scheduleId}`);
            
            const params = [`=.id=${scheduleId}`];
            
            if (scheduleData.name) params.push(`=name=${scheduleData.name}`);
            if (scheduleData.on_event !== undefined) params.push(`=on-event=${scheduleData.on_event}`);
            if (scheduleData.start_date !== undefined) params.push(`=start-date=${scheduleData.start_date}`);
            if (scheduleData.start_time !== undefined) params.push(`=start-time=${scheduleData.start_time}`);
            if (scheduleData.interval !== undefined) params.push(`=interval=${scheduleData.interval}`);
            if (scheduleData.count !== undefined) params.push(`=count=${scheduleData.count}`);
            if (scheduleData.comment !== undefined) params.push(`=comment=${scheduleData.comment}`);
            if (scheduleData.disabled !== undefined) params.push(`=disabled=${scheduleData.disabled}`);
            if (scheduleData.policy !== undefined) params.push(`=policy=${scheduleData.policy}`);
            if (scheduleData.owner !== undefined) params.push(`=owner=${scheduleData.owner}`);
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params.map(p => p.includes('on-event=') ? p.substring(0, 50) + '...' : p));
            
            const result = await conn.write('/system/scheduler/set', params);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Schedule atualizado com sucesso ID: ${scheduleId}`);
            
            return result;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao atualizar schedule:`, error.message);
            throw error;
        }
    }

    async deleteSchedule(host, username, password, scheduleId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Removendo schedule ID: ${scheduleId}`);
            
            const result = await conn.write('/system/scheduler/remove', [`=.id=${scheduleId}`]);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Schedule removido com sucesso ID: ${scheduleId}`);
            
            return result;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao remover schedule:`, error.message);
            throw error;
        }
    }

    async getScheduleById(host, username, password, scheduleId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Buscando schedule ID: ${scheduleId}`);
            
            const schedules = await conn.write('/system/scheduler/print', [`=.id=${scheduleId}`]);
            
            if (schedules.length === 0) {
                throw new Error(`Schedule com ID ${scheduleId} não encontrado`);
            }
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Schedule encontrado: ${schedules[0].name}`);
            return schedules[0];
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao buscar schedule:`, error.message);
            throw error;
        }
    }

    async enableSchedule(host, username, password, scheduleId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Habilitando schedule ID: ${scheduleId}`);
            
            const result = await conn.write('/system/scheduler/set', [
                `=.id=${scheduleId}`,
                '=disabled=no'
            ]);
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Schedule habilitado com sucesso ID: ${scheduleId}`);
            return result;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao habilitar schedule:`, error.message);
            throw error;
        }
    }

    async disableSchedule(host, username, password, scheduleId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Desabilitando schedule ID: ${scheduleId}`);
            
            const result = await conn.write('/system/scheduler/set', [
                `=.id=${scheduleId}`,
                '=disabled=yes'
            ]);
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Schedule desabilitado com sucesso ID: ${scheduleId}`);
            return result;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao desabilitar schedule:`, error.message);
            throw error;
        }
    }

    // ==================== TEMPLATES DE SCHEDULES ====================
    
    getScheduleTemplates() {
        console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Obtendo templates de schedules`);
        
        return {
            daily_backup: {
                name: "Daily Backup",
                description: "Backup diário automático",
                on_event: `/system backup save name=("backup-daily-" . [/system clock get date])
:log info "Backup diário executado"`,
                start_time: "02:00:00",
                interval: "1d",
                policy: "read,write,policy,test,password,sniff,sensitive,romon"
            },
            weekly_cleanup: {
                name: "Weekly Cleanup",
                description: "Limpeza semanal de logs",
                on_event: `:log info "Iniciando limpeza semanal de logs"
/log remove [find]
:log info "Limpeza semanal concluída"`,
                start_time: "03:00:00",
                interval: "7d",
                policy: "read,write,policy,test,password,sniff,sensitive,romon"
            },
            hourly_stats: {
                name: "Hourly Stats",
                description: "Coleta de estatísticas a cada hora",
                on_event: `:local cpuLoad [/system resource get cpu-load]
:local freeMemory [/system resource get free-memory]
:local totalMemory [/system resource get total-memory]
:log info ("Stats - CPU: " . $cpuLoad . "%, Mem: " . $freeMemory . "/" . $totalMemory)`,
                start_time: "00:00:00",
                interval: "01:00:00",
                policy: "read,test"
            },
            monthly_report: {
                name: "Monthly Report",
                description: "Relatório mensal do sistema",
                on_event: `:log info "Gerando relatório mensal"
:local uptime [/system resource get uptime]
:local version [/system resource get version]
:local board [/system resource get board-name]
:log info ("Relatório Mensal - Uptime: " . $uptime . " - Versão: " . $version . " - Board: " . $board)`,
                start_date: "jan/01/2024",
                start_time: "06:00:00",
                interval: "30d",
                policy: "read,test"
            },
            interface_monitor: {
                name: "Interface Monitor",
                description: "Monitoramento de interfaces a cada 5 minutos",
                on_event: `:foreach interface in=[/interface find] do={
    :local interfaceName [/interface get $interface name]
    :local interfaceRunning [/interface get $interface running]
    :if ($interfaceRunning = false) do={
        :log warning ("Interface " . $interfaceName . " está DOWN!")
    }
}`,
                start_time: "00:00:00",
                interval: "00:05:00",
                policy: "read,test"
            },
            hotspot_user_check: {
                name: "Hotspot User Check",
                description: "Verificação de usuários hotspot inativos",
                on_event: `:local inactiveUsers 0
:foreach user in=[/ip hotspot user find] do={
    :local userName [/ip hotspot user get $user name]
    :local bytesIn [/ip hotspot user get $user bytes-in]
    :if ($bytesIn = 0) do={
        :set inactiveUsers ($inactiveUsers + 1)
    }
}
:log info ("Usuários inativos no hotspot: " . $inactiveUsers)`,
                start_time: "12:00:00",
                interval: "12:00:00",
                policy: "read,test"
            },
            system_reboot: {
                name: "System Reboot",
                description: "Reinicialização automática semanal",
                on_event: `:log info "Reinicialização automática agendada"
/system reboot`,
                start_time: "04:00:00",
                interval: "7d",
                count: 0,
                policy: "read,write,policy,reboot"
            }
        };
    }

    async createScheduleFromTemplate(host, username, password, templateName, scheduleName, customOptions = {}, port = 8728) {
        try {
            const templates = this.getScheduleTemplates();
            
            if (!templates[templateName]) {
                throw new Error(`Template ${templateName} não encontrado`);
            }
            
            const template = templates[templateName];
            const scheduleData = {
                name: scheduleName,
                on_event: template.on_event,
                start_date: customOptions.start_date || template.start_date,
                start_time: customOptions.start_time || template.start_time,
                interval: customOptions.interval || template.interval,
                count: customOptions.count || template.count,
                comment: customOptions.comment || template.description,
                policy: customOptions.policy || template.policy,
                disabled: customOptions.disabled !== undefined ? customOptions.disabled : false
            };
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Criando schedule do template: ${templateName}`);
            
            return await this.createSchedule(host, username, password, scheduleData, port);
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao criar schedule do template:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS DE TEMPO ====================
    
    generateTimeOptions() {
        return {
            intervals: {
                '30s': '00:00:30',
                '1m': '00:01:00',
                '5m': '00:05:00',
                '10m': '00:10:00',
                '15m': '00:15:00',
                '30m': '00:30:00',
                '1h': '01:00:00',
                '2h': '02:00:00',
                '6h': '06:00:00',
                '12h': '12:00:00',
                '1d': '1d',
                '7d': '7d',
                '30d': '30d'
            },
            common_times: {
                'midnight': '00:00:00',
                'early_morning': '02:00:00',
                'morning': '06:00:00',
                'noon': '12:00:00',
                'afternoon': '15:00:00',
                'evening': '18:00:00',
                'night': '21:00:00',
                'late_night': '23:00:00'
            }
        };
    }

    validateScheduleTime(timeString) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        return timeRegex.test(timeString);
    }

    validateScheduleInterval(intervalString) {
        const intervalRegex = /^(\d+d|\d{2}:\d{2}:\d{2})$/;
        return intervalRegex.test(intervalString);
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getScheduleStats(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Coletando estatísticas de schedules para ${host}`);
            
            const schedules = await this.listSchedules(host, username, password, port);
            
            const stats = {
                total_schedules: schedules.length,
                enabled_schedules: 0,
                disabled_schedules: 0,
                schedules_by_interval: {},
                schedules_by_owner: {},
                schedules_by_policy: {},
                next_runs: [],
                timestamp: new Date().toISOString()
            };

            schedules.forEach(schedule => {
                // Contar habilitados/desabilitados
                if (schedule.disabled === 'true') {
                    stats.disabled_schedules++;
                } else {
                    stats.enabled_schedules++;
                }

                // Agrupar por intervalo
                const interval = schedule.interval || 'once';
                stats.schedules_by_interval[interval] = (stats.schedules_by_interval[interval] || 0) + 1;

                // Agrupar por owner
                const owner = schedule.owner || 'unknown';
                stats.schedules_by_owner[owner] = (stats.schedules_by_owner[owner] || 0) + 1;

                // Agrupar por policy
                const policy = schedule.policy || 'none';
                stats.schedules_by_policy[policy] = (stats.schedules_by_policy[policy] || 0) + 1;

                // Próximas execuções
                if (schedule['next-run']) {
                    stats.next_runs.push({
                        name: schedule.name,
                        next_run: schedule['next-run'],
                        interval: schedule.interval
                    });
                }
            });

            // Ordenar próximas execuções
            stats.next_runs.sort((a, b) => new Date(a.next_run) - new Date(b.next_run));
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Estatísticas de schedules coletadas com sucesso`);
            
            return stats;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
            throw error;
        }
    }

    // ==================== OPERAÇÕES EM LOTE ====================
    
    async enableAllSchedules(host, username, password, port = 8728) {
        try {
            const schedules = await this.listSchedules(host, username, password, port);
            const results = [];
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Habilitando todos os schedules (${schedules.length})`);
            
            for (const schedule of schedules) {
                try {
                    await this.enableSchedule(host, username, password, schedule['.id'], port);
                    results.push({ id: schedule['.id'], name: schedule.name, success: true });
                } catch (error) {
                    results.push({ id: schedule['.id'], name: schedule.name, success: false, error: error.message });
                }
            }
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Operação em lote concluída`);
            return results;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro na operação em lote:`, error.message);
            throw error;
        }
    }

    async disableAllSchedules(host, username, password, port = 8728) {
        try {
            const schedules = await this.listSchedules(host, username, password, port);
            const results = [];
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Desabilitando todos os schedules (${schedules.length})`);
            
            for (const schedule of schedules) {
                try {
                    await this.disableSchedule(host, username, password, schedule['.id'], port);
                    results.push({ id: schedule['.id'], name: schedule.name, success: true });
                } catch (error) {
                    results.push({ id: schedule['.id'], name: schedule.name, success: false, error: error.message });
                }
            }
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Operação em lote concluída`);
            return results;
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro na operação em lote:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            await conn.write('/system/identity/print');
            
            console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[SCHEDULES-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
    }
}

module.exports = SchedulesService;