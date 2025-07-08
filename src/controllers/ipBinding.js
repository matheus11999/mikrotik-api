const IpBindingService = require('../services/ipBinding');

class IpBindingController {
    constructor() {
        this.ipBindingService = new IpBindingService();
    }

    // ==================== LISTAR IP BINDINGS ====================
    
    async listIpBindings(req, res) {
        try {
            const { credentials } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            const bindings = await this.ipBindingService.listIpBindings(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: bindings,
                count: bindings.length
            });
        } catch (error) {
            console.error('Erro ao listar IP bindings:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== CRIAR IP BINDING ====================
    
    async createIpBinding(req, res) {
        try {
            const { credentials, binding } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!binding || !binding.macAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados do IP binding são obrigatórios (macAddress)'
                });
            }

            const result = await this.ipBindingService.createIpBinding(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                binding,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: result,
                message: 'IP binding criado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao criar IP binding:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== ATUALIZAR IP BINDING ====================
    
    async updateIpBinding(req, res) {
        try {
            const { id } = req.params;
            const { credentials, binding } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do IP binding é obrigatório'
                });
            }

            const result = await this.ipBindingService.updateIpBinding(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                id,
                binding,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: result,
                message: 'IP binding atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao atualizar IP binding:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== DELETAR IP BINDING ====================
    
    async deleteIpBinding(req, res) {
        try {
            const { id } = req.params;
            const { credentials } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do IP binding é obrigatório'
                });
            }

            const result = await this.ipBindingService.deleteIpBinding(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                id,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: result,
                message: 'IP binding deletado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar IP binding:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== BUSCAR IP BINDING POR ID ====================
    
    async getIpBindingById(req, res) {
        try {
            const { id } = req.params;
            const { credentials } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do IP binding é obrigatório'
                });
            }

            const binding = await this.ipBindingService.getIpBindingById(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                id,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: binding
            });
        } catch (error) {
            console.error('Erro ao buscar IP binding por ID:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== BUSCAR IP BINDING POR MAC ====================
    
    async findIpBindingByMac(req, res) {
        try {
            const { mac } = req.params;
            const { credentials } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!mac) {
                return res.status(400).json({
                    success: false,
                    error: 'MAC address é obrigatório'
                });
            }

            const bindings = await this.ipBindingService.findIpBindingByMac(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                mac,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: bindings,
                count: bindings.length
            });
        } catch (error) {
            console.error('Erro ao buscar IP binding por MAC:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== DELETAR IP BINDING POR MAC ====================
    
    async deleteIpBindingByMac(req, res) {
        try {
            const { mac } = req.params;
            const { credentials } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!mac) {
                return res.status(400).json({
                    success: false,
                    error: 'MAC address é obrigatório'
                });
            }

            const result = await this.ipBindingService.deleteIpBindingByMac(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                mac,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: result,
                message: `${result.deletedCount} IP binding(s) deletado(s) para MAC: ${mac}`
            });
        } catch (error) {
            console.error('Erro ao deletar IP binding por MAC:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== CRIAR IP BINDING PARA PAGAMENTO APROVADO ====================
    
    async createIpBindingFromPayment(req, res) {
        try {
            const { credentials, paymentData } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            if (!paymentData || !paymentData.payment_id || !paymentData.mac_address) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados do pagamento são obrigatórios (payment_id, mac_address)'
                });
            }

            const result = await this.ipBindingService.createIpBindingFromPayment(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                paymentData,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: result,
                message: 'IP binding criado com sucesso para pagamento aprovado'
            });
        } catch (error) {
            console.error('Erro ao criar IP binding para pagamento:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ==================== TESTAR CONEXÃO ====================
    
    async testConnection(req, res) {
        try {
            const { credentials } = req.body;
            
            if (!credentials || !credentials.ip || !credentials.usuario || !credentials.senha) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais do MikroTik são obrigatórias (ip, usuario, senha)'
                });
            }

            const result = await this.ipBindingService.testConnection(
                credentials.ip,
                credentials.usuario,
                credentials.senha,
                credentials.porta || 8728
            );

            res.json({
                success: true,
                data: result,
                message: 'Conexão testada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao testar conexão:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new IpBindingController();