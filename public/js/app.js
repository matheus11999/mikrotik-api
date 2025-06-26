// MikroTik API Interface JavaScript

class MikroTikAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.connectionParams = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHotspotUsers();
    }

    setupEventListeners() {
        // Connection form
        document.getElementById('connectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.testConnection();
        });

        // Section navigation
        document.querySelectorAll('.section-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.section-link').dataset.section;
                this.showSection(section);
            });
        });

        // Hotspot tabs
        document.querySelectorAll('.hotspot-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                this.showHotspotTab(tabName);
            });
        });
    }

    // Connection Management
    getConnectionParams() {
        return {
            ip: document.getElementById('host').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            port: document.getElementById('port').value || 8728
        };
    }

    async testConnection() {
        const params = this.getConnectionParams();
        
        if (!params.ip || !params.username || !params.password) {
            this.showAlert('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        try {
            this.showLoading('Testando conexão...');
            
            const response = await this.makeRequest('POST', '/test-connection', null, params);
            
            if (response.success) {
                this.connectionParams = params;
                this.updateConnectionStatus(true);
                this.showAlert('Conexão estabelecida com sucesso!', 'success');
                this.loadInitialData();
            } else {
                this.updateConnectionStatus(false);
                this.showAlert('Falha na conexão: ' + response.error, 'danger');
            }
        } catch (error) {
            this.updateConnectionStatus(false);
            this.showAlert('Erro ao testar conexão: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-circle text-success me-2"></i>Conectado';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle text-danger me-2"></i>Desconectado';
        }
    }

    // API Request Helper
    async makeRequest(method, endpoint, data = null, params = null) {
        const queryParams = params ? new URLSearchParams(params).toString() : '';
        const url = `${this.baseURL}${endpoint}${queryParams ? '?' + queryParams : ''}`;
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // Section Management
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Update navigation
        document.querySelectorAll('.section-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Load section data
        this.loadSectionData(sectionName);
    }

    showHotspotTab(tabName) {
        // Hide all hotspot content
        document.querySelectorAll('.hotspot-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab content
        document.getElementById(`hotspot-${tabName}`).classList.add('active');

        // Update tab buttons
        document.querySelectorAll('.hotspot-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Load tab data
        this.loadHotspotTabData(tabName);
    }

    // Data Loading
    async loadSectionData(section) {
        switch (section) {
            case 'hotspot':
                this.loadHotspotUsers();
                break;
            case 'system':
                // System data loaded on demand
                break;
            case 'scripts':
                this.loadScripts();
                break;
            case 'schedules':
                this.loadSchedules();
                break;
        }
    }

    async loadHotspotTabData(tab) {
        switch (tab) {
            case 'users':
                this.loadHotspotUsers();
                break;
            case 'profiles':
                this.loadHotspotProfiles();
                break;
            case 'active':
                this.loadActiveUsers();
                break;
            case 'stats':
                this.loadHotspotStats();
                break;
        }
    }

    async loadInitialData() {
        this.loadHotspotUsers();
        this.loadHotspotProfiles();
    }

    // Hotspot Users
    async loadHotspotUsers() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/hotspot/users', null, this.connectionParams);
            this.displayHotspotUsers(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.showAlert('Erro ao carregar usuários do hotspot', 'danger');
        }
    }

    displayHotspotUsers(users) {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${user.name || ''}</td>
                <td>${user.profile || 'default'}</td>
                <td>${user.server || 'hotspot1'}</td>
                <td><span class="badge ${user.disabled === 'true' ? 'bg-secondary' : 'bg-success'}">${user.disabled === 'true' ? 'Desabilitado' : 'Ativo'}</span></td>
                <td>${user.comment || ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user['.id']}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user['.id']}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    }

    // Hotspot Profiles
    async loadHotspotProfiles() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/hotspot/profiles', null, this.connectionParams);
            this.displayHotspotProfiles(response.data || []);
            this.updateProfileSelect(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar profiles:', error);
            this.showAlert('Erro ao carregar profiles do hotspot', 'danger');
        }
    }

    displayHotspotProfiles(profiles) {
        const tbody = document.querySelector('#profilesTable tbody');
        tbody.innerHTML = '';

        profiles.forEach(profile => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${profile.name || ''}</td>
                <td>${profile['rate-limit'] || ''}</td>
                <td>${profile['session-timeout'] || ''}</td>
                <td>${profile['idle-timeout'] || ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProfile('${profile['.id']}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProfile('${profile['.id']}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    }

    updateProfileSelect(profiles) {
        const select = document.getElementById('userProfile');
        select.innerHTML = '<option value="default">default</option>';
        
        profiles.forEach(profile => {
            if (profile.name !== 'default') {
                const option = document.createElement('option');
                option.value = profile.name;
                option.textContent = profile.name;
                select.appendChild(option);
            }
        });
    }

    // Active Users
    async loadActiveUsers() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/hotspot/active-users', null, this.connectionParams);
            this.displayActiveUsers(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar usuários ativos:', error);
            this.showAlert('Erro ao carregar usuários ativos', 'danger');
        }
    }

    displayActiveUsers(activeUsers) {
        const tbody = document.querySelector('#activeUsersTable tbody');
        tbody.innerHTML = '';

        activeUsers.forEach(user => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${user.user || ''}</td>
                <td>${user.address || ''}</td>
                <td>${user['mac-address'] || ''}</td>
                <td>${user.uptime || ''}</td>
                <td>${this.formatBytes(user['bytes-in'] || 0)}</td>
                <td>${this.formatBytes(user['bytes-out'] || 0)}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="disconnectUser('${user['.id']}')">
                        <i class="fas fa-sign-out-alt"></i> Desconectar
                    </button>
                </td>
            `;
        });
    }

    // Hotspot Stats
    async loadHotspotStats() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/hotspot/stats', null, this.connectionParams);
            this.displayHotspotStats(response.data || {});
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.showAlert('Erro ao carregar estatísticas do hotspot', 'danger');
        }
    }

    displayHotspotStats(stats) {
        const content = document.getElementById('hotspotStatsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number">${stats.total_users || 0}</div>
                        <div class="stats-label">Total de Usuários</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number">${stats.active_users || 0}</div>
                        <div class="stats-label">Usuários Ativos</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number">${stats.total_profiles || 0}</div>
                        <div class="stats-label">Profiles</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number">${stats.total_servers || 0}</div>
                        <div class="stats-label">Servidores</div>
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <h6>Usuários por Profile</h6>
                <pre>${JSON.stringify(stats.users_by_profile || {}, null, 2)}</pre>
            </div>
        `;
    }

    // Scripts
    async loadScripts() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/scripts', null, this.connectionParams);
            this.displayScripts(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar scripts:', error);
            this.showAlert('Erro ao carregar scripts', 'danger');
        }
    }

    displayScripts(scripts) {
        const tbody = document.querySelector('#scriptsTable tbody');
        tbody.innerHTML = '';

        scripts.forEach(script => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${script.name || ''}</td>
                <td>${script.owner || ''}</td>
                <td>${script.policy || ''}</td>
                <td>${script.comment || ''}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="runScript('${script['.id']}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editScript('${script['.id']}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteScript('${script['.id']}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    }

    // Schedules
    async loadSchedules() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/schedules', null, this.connectionParams);
            this.displaySchedules(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar schedules:', error);
            this.showAlert('Erro ao carregar agendamentos', 'danger');
        }
    }

    displaySchedules(schedules) {
        const tbody = document.querySelector('#schedulesTable tbody');
        tbody.innerHTML = '';

        schedules.forEach(schedule => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${schedule.name || ''}</td>
                <td>${schedule.interval || ''}</td>
                <td>${schedule['next-run'] || ''}</td>
                <td><span class="badge ${schedule.disabled === 'true' ? 'bg-secondary' : 'bg-success'}">${schedule.disabled === 'true' ? 'Desabilitado' : 'Ativo'}</span></td>
                <td>${schedule.comment || ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editSchedule('${schedule['.id']}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule['.id']}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    }

    // System Info
    async loadSystemInfo() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/system/info', null, this.connectionParams);
            this.displaySystemInfo(response.data || {});
        } catch (error) {
            console.error('Erro ao carregar informações do sistema:', error);
            this.showAlert('Erro ao carregar informações do sistema', 'danger');
        }
    }

    displaySystemInfo(info) {
        const content = document.getElementById('systemContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Identidade</h6>
                    <pre>${JSON.stringify(info.identity || {}, null, 2)}</pre>
                </div>
                <div class="col-md-6">
                    <h6>Recursos</h6>
                    <pre>${JSON.stringify(info.resource || {}, null, 2)}</pre>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6>Relógio</h6>
                    <pre>${JSON.stringify(info.clock || {}, null, 2)}</pre>
                </div>
                <div class="col-md-6">
                    <h6>RouterBoard</h6>
                    <pre>${JSON.stringify(info.routerboard || {}, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    // System Logs
    async loadSystemLogs() {
        if (!this.connectionParams.ip) return;

        try {
            const response = await this.makeRequest('GET', '/system/logs', null, this.connectionParams);
            this.displaySystemLogs(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            this.showAlert('Erro ao carregar logs do sistema', 'danger');
        }
    }

    displaySystemLogs(logs) {
        const content = document.getElementById('systemContent');
        const logsHtml = logs.map(log => `
            <div class="mb-2 p-2 border-start border-3 ${this.getLogBorderClass(log.topics)}">
                <small class="text-muted">${log.time || ''} [${log.topics || ''}]</small><br>
                ${log.message || ''}
            </div>
        `).join('');
        
        content.innerHTML = `
            <h6>Logs do Sistema (últimos ${logs.length})</h6>
            <div style="max-height: 400px; overflow-y: auto;">
                ${logsHtml}
            </div>
        `;
    }

    getLogBorderClass(topics) {
        if (!topics) return 'border-secondary';
        if (topics.includes('error')) return 'border-danger';
        if (topics.includes('warning')) return 'border-warning';
        if (topics.includes('info')) return 'border-info';
        return 'border-secondary';
    }

    // Utility Functions
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showAlert(message, type) {
        // Create and show alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showLoading(message = 'Carregando...') {
        // Implementation for loading indicator
        console.log(message);
    }

    hideLoading() {
        // Implementation for hiding loading indicator
    }

    showResponse(data) {
        document.getElementById('responseContent').textContent = JSON.stringify(data, null, 2);
        new bootstrap.Modal(document.getElementById('responseModal')).show();
    }
}

// Global functions for button actions
async function createUser() {
    const userData = {
        name: document.getElementById('userName').value,
        password: document.getElementById('userPassword').value,
        profile: document.getElementById('userProfile').value,
        comment: document.getElementById('userComment').value
    };

    try {
        const response = await api.makeRequest('POST', '/hotspot/users', userData, api.connectionParams);
        api.showAlert('Usuário criado com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        api.loadHotspotUsers();
        document.getElementById('userForm').reset();
    } catch (error) {
        api.showAlert('Erro ao criar usuário: ' + error.message, 'danger');
    }
}

async function createProfile() {
    const profileData = {
        name: document.getElementById('profileName').value,
        rate_limit: document.getElementById('profileRateLimit').value,
        session_timeout: document.getElementById('profileSessionTimeout').value
    };

    try {
        const response = await api.makeRequest('POST', '/hotspot/profiles', profileData, api.connectionParams);
        api.showAlert('Profile criado com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        api.loadHotspotProfiles();
        document.getElementById('profileForm').reset();
    } catch (error) {
        api.showAlert('Erro ao criar profile: ' + error.message, 'danger');
    }
}

async function createScript() {
    const scriptData = {
        name: document.getElementById('scriptName').value,
        source: document.getElementById('scriptSource').value,
        comment: document.getElementById('scriptComment').value
    };

    try {
        const response = await api.makeRequest('POST', '/scripts', scriptData, api.connectionParams);
        api.showAlert('Script criado com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('scriptModal')).hide();
        api.loadScripts();
        document.getElementById('scriptForm').reset();
    } catch (error) {
        api.showAlert('Erro ao criar script: ' + error.message, 'danger');
    }
}

async function createSchedule() {
    const scheduleData = {
        name: document.getElementById('scheduleName').value,
        on_event: document.getElementById('scheduleOnEvent').value,
        start_time: document.getElementById('scheduleStartTime').value,
        interval: document.getElementById('scheduleInterval').value,
        comment: document.getElementById('scheduleComment').value
    };

    try {
        const response = await api.makeRequest('POST', '/schedules', scheduleData, api.connectionParams);
        api.showAlert('Agendamento criado com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('scheduleModal')).hide();
        api.loadSchedules();
        document.getElementById('scheduleForm').reset();
    } catch (error) {
        api.showAlert('Erro ao criar agendamento: ' + error.message, 'danger');
    }
}

async function deleteUser(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
        const params = { ...api.connectionParams, id: id };
        const response = await api.makeRequest('DELETE', '/hotspot/users', null, params);
        api.showAlert('Usuário excluído com sucesso!', 'success');
        api.loadHotspotUsers();
    } catch (error) {
        api.showAlert('Erro ao excluir usuário: ' + error.message, 'danger');
    }
}

async function runScript(id) {
    try {
        const params = { ...api.connectionParams, id: id };
        const response = await api.makeRequest('POST', '/scripts/run', null, params);
        api.showAlert('Script executado com sucesso!', 'success');
        api.showResponse(response);
    } catch (error) {
        api.showAlert('Erro ao executar script: ' + error.message, 'danger');
    }
}

async function disconnectUser(id) {
    if (!confirm('Tem certeza que deseja desconectar este usuário?')) return;

    try {
        const params = { ...api.connectionParams, id: id };
        const response = await api.makeRequest('POST', '/hotspot/disconnect', null, params);
        api.showAlert('Usuário desconectado com sucesso!', 'success');
        api.loadActiveUsers();
    } catch (error) {
        api.showAlert('Erro ao desconectar usuário: ' + error.message, 'danger');
    }
}

// Placeholder functions for other actions
function editUser(id) { console.log('Edit user:', id); }
function editProfile(id) { console.log('Edit profile:', id); }
function deleteProfile(id) { console.log('Delete profile:', id); }
function editScript(id) { console.log('Edit script:', id); }
function deleteScript(id) { console.log('Delete script:', id); }
function editSchedule(id) { console.log('Edit schedule:', id); }
function deleteSchedule(id) { console.log('Delete schedule:', id); }

// Initialize the API when the page loads
const api = new MikroTikAPI();