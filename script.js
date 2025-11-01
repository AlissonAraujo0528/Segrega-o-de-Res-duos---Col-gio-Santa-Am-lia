(() => {
    'use strict';

    // --- CONFIGURAÇÃO E CONSTANTES ---
    const SUPABASE_URL = 'https://hjkulurewbihxpdaqtvk.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa3VsdXJld2JpaHhwZGFxdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMyMDEsImV4cCI6MjA3NjE5OTIwMX0.V3dcIxhbSZ1-HAW4HIVvPSD97le_F1j0QrwCogkvAio';
    // ATENÇÃO: Confirme que o nome da sua função é 'submit-evaluation'
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-evaluation`;
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- ESTADO DA APLICAÇÃO ---
    const appState = {
        userRole: null,
        currentUserId: null, 
        currentlyEditingId: null,
        currentPage: 1,
        recordsPerPage: 10,
        chartInstances: {}, // Armazena todas as instâncias de gráficos
        searchDebounceTimer: null,
        inactivityTimer: null,
        currentConfirmCallback: null,
        sectorsList: [], 
        kpiGoal: 18, 
    };

    // --- SELETORES DE ELEMENTOS DOM ---
    const ui = {
        loginModal: document.getElementById('login-modal'),
        loginForm: document.getElementById('login-form'),
        loginError: document.getElementById('login-error'),
        loginBtn: document.getElementById('login-btn'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        forgotPasswordModal: document.getElementById('forgot-password-modal'),
        forgotPasswordForm: document.getElementById('forgot-password-form'),
        recoveryBtn: document.getElementById('recovery-btn'),
        recoveryError: document.getElementById('recovery-error'),
        appContainer: document.getElementById('app-container'),
        logoutBtn: document.getElementById('logout-btn'),
        form: document.getElementById('evaluation-form'),
        totalScoreSpan: document.getElementById('total-score'),
        evaluationDateInput: document.getElementById('evaluation-date'),
        submitBtn: document.querySelector('#evaluation-form button[type="submit"]'),
        clearBtn: document.getElementById('clear-btn'),
        sectorSelect: document.getElementById('sector'), 
        responsibleInput: document.getElementById('responsible'), 
        rankingModal: document.getElementById('ranking-modal'),
        openRankingBtn: document.getElementById('open-ranking-btn'),
        resultsBody: document.getElementById('results-body'),
        resultsLoader: document.getElementById('results-loader'),
        exportBtn: document.getElementById('export-xls-btn'),
        rankingFilter: document.getElementById('ranking-filter'),
        dashboardModal: document.getElementById('dashboard-modal'),
        openDashboardBtn: document.getElementById('open-dashboard-btn'),
        paginationControls: document.getElementById('pagination-controls'),
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        currentPageDisplay: document.getElementById('current-page-display'),
        adminActionsContainer: document.getElementById('admin-actions'),
        resetDbBtn: document.getElementById('reset-db-btn'),
        notificationArea: document.getElementById('notification-area'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn'),

        // Seletores do NOVO Dashboard
        kpiWidgetContainer: document.getElementById('kpi-widget-container'),
        medalBoardContainer: document.getElementById('medal-board-container')
    };

    // --- FUNÇÕES UTILITÁRIAS ---
    const sanitizeHTML = (str) => {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        ui.notificationArea.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }, 10);
    };

    const showConfirmation = (title, message, onConfirm, okBtnText = 'Sim', okBtnClass = 'submit-btn') => {
        ui.confirmTitle.textContent = title;
        ui.confirmMessage.textContent = message;
        ui.confirmOkBtn.textContent = okBtnText;
        ui.confirmOkBtn.className = `action-btn ${okBtnClass}`;
        appState.currentConfirmCallback = onConfirm;
        ui.confirmModal.classList.add('active');
    };

    const toggleButtonLoading = (button, isLoading) => {
        const textEl = button.querySelector('.btn-text');
        const loaderEl = button.querySelector('.btn-loader-icon');
        if (isLoading) {
            button.disabled = true;
            if (textEl) textEl.style.display = 'none';
            if (loaderEl) loaderEl.style.display = 'inline-block';
        } else {
            button.disabled = false;
            if (textEl) textEl.style.display = 'inline-block';
            if (loaderEl) loaderEl.style.display = 'none';
        }
    };
    
    const getCssVariable = (variableName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    };

    // --- AUTENTICAÇÃO E SESSÃO ---
    const handleLogin = async (event) => {
        event.preventDefault();
        ui.loginError.textContent = '';
        toggleButtonLoading(ui.loginBtn, true);
        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: ui.loginForm.elements.email.value,
                password: ui.loginForm.elements.password.value,
            });
            if (error) throw error;
        } catch (error) {
            ui.loginError.textContent = 'Email ou senha inválidos.';
            toggleButtonLoading(ui.loginBtn, false);
        }
    };

    // CORREÇÃO: Logout forçado com reload
    const handleLogout = async () => {
        showConfirmation('Sair do Sistema', 'Deseja realmente sair?', async () => {
            ui.confirmModal.classList.remove('active');
            clearTimeout(appState.inactivityTimer);
            await supabaseClient.auth.signOut();
            // Força a recarga da página para limpar o estado
            window.location.reload(); 
        }, 'Sair', 'danger-btn');
    };
    
    const handleForgotPassword = async (event) => {
        event.preventDefault();
        ui.recoveryError.textContent = '';
        toggleButtonLoading(ui.recoveryBtn, true);
        const email = ui.forgotPasswordForm.elements['recovery-email'].value;
        const redirectTo = 'https://alissonaraujo0528.github.io/Segrega-o-de-Res-duos---Col-gio-Santa-Am-lia/reset-password.html';
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            document.querySelector('#forgot-password-modal').classList.remove('active');
            showNotification('E-mail de recuperação enviado! Verifique a sua caixa de entrada.');
        } catch (error) {
            ui.recoveryError.textContent = 'Erro ao enviar. Verifique o e-mail digitado.';
        } finally {
            toggleButtonLoading(ui.recoveryBtn, false);
        }
    };

    const checkUserProfileAndInitialize = async (user) => {
        try {
            const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role');
            
            if (roleError) throw roleError;
            if (!role) throw new Error("Perfil de usuário não foi encontrado na base de dados.");

            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('must_change_password')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            
            if (profile.must_change_password) {
                window.location.href = 'reset-password.html'; 
            } else {
                appState.userRole = role;
                appState.currentUserId = user.id; 
                initializeAppUI();
            }
        } catch (error) {
            console.error("Erro ao procurar perfil:", error);
            showNotification("O seu perfil de utilizador não foi encontrado. Contacte o administrador.", "error");
            await supabaseClient.auth.signOut();
        }
    };

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            checkUserProfileAndInitialize(session.user);
        } else if (event === 'SIGNED_OUT') {
            ui.appContainer.classList.add('hidden');
            ui.loginModal.classList.add('active');
            appState.userRole = null;
            appState.currentUserId = null; 
            clearTimeout(appState.inactivityTimer);
            toggleButtonLoading(ui.loginBtn, false);
            // CORREÇÃO (Defesa): Recarrega a página se o estado mudar para SIGNED_OUT
            if (!ui.appContainer.classList.contains('hidden')) {
                window.location.reload();
            }
        }
    });
    
    // --- LÓGICA PRINCIPAL DA APLICAÇÃO ---

    const loadSectors = async () => {
        const { data, error } = await supabaseClient
            .from('sectors')
            .select('id, name, default_responsible');
            // Removemos .order() para usar o sort natural

        if (error) {
            console.error('Erro ao carregar setores:', error);
            ui.sectorSelect.innerHTML = '<option value="">Falha ao carregar setores</option>';
            return;
        }

        // CORREÇÃO: Organiza os dados aqui usando "Natural Sort"
        data.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });

        appState.sectorsList = data; 
        ui.sectorSelect.innerHTML = '<option value="">--- Selecione um setor ---</option>';
        
        data.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector.id;
            option.textContent = sector.name;
            ui.sectorSelect.appendChild(option);
        });
    };

    const handleSectorChange = () => {
        const selectedSectorId = ui.sectorSelect.value;
        const selectedSector = appState.sectorsList.find(s => s.id === selectedSectorId);
        
        if (selectedSector && selectedSector.default_responsible) {
            ui.responsibleInput.value = selectedSector.default_responsible;
        } else if (!selectedSectorId) {
            ui.responsibleInput.value = '';
        }
    };

    const initializeAppUI = () => {
        ui.loginModal.classList.remove('active');
        ui.appContainer.classList.remove('hidden');
        ui.evaluationDateInput.max = new Date().toISOString().split("T")[0];
        ui.evaluationDateInput.valueAsDate = new Date();
        ui.adminActionsContainer.style.display = appState.userRole === 'admin' ? 'block' : 'none';
        
        loadSectors(); 
        
        resetInactivityTimer();
    };

    const calculateScore = () => {
        const totalScore = [...ui.form.querySelectorAll('input[type="radio"]:checked')].reduce((sum, radio) => sum + parseInt(radio.value, 10), 0);
        ui.totalScoreSpan.textContent = totalScore;
        ui.totalScoreSpan.style.transform = 'scale(1.1)';
        setTimeout(() => { ui.totalScoreSpan.style.transform = 'scale(1)'; }, 150);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const evaluator = ui.form.elements.evaluator.value.trim();
        const sector = ui.sectorSelect.value; 
        const responsible = ui.responsibleInput.value.trim();
        const organicos = ui.form.elements.organicos.value;
        const sanitarios = ui.form.elements.sanitarios.value;
        const outros = ui.form.elements.outros.value;
        const nivel = ui.form.elements.nivel.value;

        let missingFields = [];
        if (!evaluator) missingFields.push('Avaliador');
        if (!sector) missingFields.push('Setor/Sala'); 
        if (!responsible) missingFields.push('Responsável');
        if (!organicos) missingFields.push('"Resíduos Orgânicos"');
        if (!sanitarios) missingFields.push('"Papéis Sanitários"');
        if (!outros) missingFields.push('"Outros Não Recicláveis"');
        if (!nivel) missingFields.push('"Nível dos Coletores"');

        if (missingFields.length > 0) {
            const message = `Campos obrigatórios não preenchidos: ${missingFields.join(', ')}.`;
            return showNotification(message, 'error');
        }
        
        const evaluationData = {
            date: ui.evaluationDateInput.value,
            evaluator: sanitizeHTML(evaluator),
            sector_id: sector, 
            score: parseInt(ui.totalScoreSpan.textContent, 10),
            details: { organicos, sanitarios, outros, nivel },
            responsible: sanitizeHTML(responsible),
            observations: sanitizeHTML(ui.form.elements.observations.value.trim())
        };

        toggleButtonLoading(ui.submitBtn, true);

        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            showNotification('Sessão expirada. Faça login novamente.', 'error');
            toggleButtonLoading(ui.submitBtn, false);
            handleLogout();
            return;
        }

        try {
            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    evaluationData: evaluationData,
                    isUpdate: !!appState.currentlyEditingId,
                    evaluationId: appState.currentlyEditingId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro desconhecido do servidor.');
            }

            showNotification(result.message, 'success');
            resetFormMode();
            if (ui.rankingModal.classList.contains('active')) {
                displayResults(appState.currentPage, ui.rankingFilter.value.trim());
            }

        } catch (error) {
            console.error('Erro ao chamar Edge Function:', error);
            showNotification(`Não foi possível salvar: ${error.message}`, 'error');
        } finally {
            toggleButtonLoading(ui.submitBtn, false);
        }
    };

    const resetFormMode = () => {
        appState.currentlyEditingId = null;
        ui.form.reset();
        ui.totalScoreSpan.textContent = '0';
        ui.evaluationDateInput.max = new Date().toISOString().split("T")[0];
        ui.evaluationDateInput.valueAsDate = new Date();
        const btnText = ui.submitBtn.querySelector('.btn-text');
        if (btnText) btnText.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Avaliação';
        ui.submitBtn.classList.remove('update-btn');
        ui.submitBtn.classList.add('submit-btn');
    };

    const createResultRowHTML = (evaluation, index, from, page, filterText) => {
        const overallIndex = from + index + 1;
        const medal = (page === 1 && !filterText) ? (['🥇', '🥈', '🥉'][overallIndex - 1] || '') : '';
        const isAdmin = appState.userRole === 'admin';
        
        const sectorName = evaluation.sectors ? evaluation.sectors.name : (evaluation.sector || 'Setor Inválido');
        const isDeleted = !!evaluation.deleted_at;
        
        return `
            <tr data-evaluation-id="${evaluation.id}" class="${isDeleted ? 'deleted-row' : ''}" style="${isDeleted ? 'opacity: 0.5; background: #eee;' : ''}">
                <td>${filterText ? '-' : overallIndex + 'º'}</td>
                <td>${medal} ${sanitizeHTML(sectorName)} ${isDeleted ? '(Lixeira)' : ''}</td>
                <td>${evaluation.score}</td>
                <td>${new Date(evaluation.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td>${sanitizeHTML(evaluation.evaluator)}</td>
                <td class="actions-cell">
                    ${isAdmin ? `
                        ${isDeleted ?
                            `<button class="action-icon-btn restore" data-id="${evaluation.id}" title="Restaurar"><i class="fa-solid fa-undo"></i></button>` :
                            `<button class="action-icon-btn edit" data-id="${evaluation.id}" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                             <button class="action-icon-btn delete" data-id="${evaluation.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>`
                        }
                    ` : '<span>-</span>'}
                </td>
            </tr>`;
    };

    const displayResults = async (page = 1, filterText = '') => {
        appState.currentPage = page;
        ui.resultsBody.innerHTML = '';
        ui.resultsLoader.style.display = 'table-row';
        ui.paginationControls.style.visibility = 'hidden';

        const from = (page - 1) * appState.recordsPerPage;
        const to = from + appState.recordsPerPage - 1;
        
        let query = supabaseClient
            .from('evaluations')
            .select('*, sectors(name)', { count: 'exact' }) 
            .is('deleted_at', null); 

        if (filterText) {
            query = query.or(`evaluator.ilike.%${filterText}%,sectors.name.ilike.%${filterText}%`);
        }

        try {
            const { data: evaluations, error, count } = await query
                .order('score', { ascending: false })
                .range(from, to);
            
            if (error) throw error;

            ui.exportBtn.disabled = (count === 0);
            if (evaluations.length === 0) {
                ui.resultsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${filterText ? 'Nenhum resultado encontrado.' : 'Nenhuma avaliação cadastrada.'}</td></tr>`;
            } else {
                ui.resultsBody.innerHTML = evaluations.map((ev, index) => createResultRowHTML(ev, index, from, page, filterText)).join('');
            }

            const totalPages = Math.ceil(count / appState.recordsPerPage);
            ui.currentPageDisplay.textContent = `Página ${appState.currentPage} de ${totalPages || 1}`;
            ui.prevPageBtn.disabled = appState.currentPage === 1;
            ui.nextPageBtn.disabled = appState.currentPage >= totalPages;
            ui.paginationControls.style.visibility = 'visible';
        } catch (error) {
            console.error("Erro ao carregar ranking:", error);
            ui.resultsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Falha ao carregar dados. Tente novamente.</td></tr>`;
        } finally {
            ui.resultsLoader.style.display = 'none';
        }
    };

    const handleDelete = (idToDelete) => {
        showConfirmation('Mover para Lixeira', 'O registo será movido para a lixeira e poderá ser restaurado. Deseja continuar?', async () => {
            ui.confirmModal.classList.remove('active');
            try {
                const { error } = await supabaseClient
                    .from('evaluations')
                    .update({ deleted_at: new Date().toISOString() }) 
                    .eq('id', idToDelete);
                
                if (error) throw error;
                showNotification("Registo movido para a lixeira!");
                displayResults(appState.currentPage, ui.rankingFilter.value.trim());
            } catch (error) {
                console.error('Erro ao mover para lixeira:', error);
                showNotification(`Não foi possível excluir. ${error.message}`, 'error');
            }
        }, 'Sim, Mover para Lixeira', 'danger-btn');
    };

    const handleRestore = async (idToRestore) => {
        try {
            const { error } = await supabaseClient
                .from('evaluations')
                .update({ deleted_at: null }) 
                .eq('id', idToRestore);
            
            if (error) throw error;
            showNotification("Registo restaurado com sucesso!");
            displayResults(appState.currentPage, ui.rankingFilter.value.trim()); 
        } catch (error) {
            console.error('Erro ao restaurar:', error);
            showNotification(`Não foi possível restaurar. ${error.message}`, 'error');
        }
    };
    
    const handleEdit = async (idToEdit) => {
        try {
            const { data: evaluation, error } = await supabaseClient
                .from('evaluations')
                .select('*')
                .eq('id', idToEdit)
                .single();
            if (error) throw error;

            appState.currentlyEditingId = idToEdit;
            
            Object.keys(evaluation).forEach(key => {
                const el = ui.form.elements[key];
                if (el && key !== 'details' && key !== 'sector_id' && key !== 'sector') { 
                    el.value = evaluation[key] || '';
                }
            });
            ui.form.elements['evaluation-date'].value = evaluation.date;
            ui.sectorSelect.value = evaluation.sector_id; 

            const details = evaluation.details || {};
            for (const key in details) {
                const radio = ui.form.querySelector(`input[name="${key}"][value="${details[key]}"]`);
                if (radio) radio.checked = true;
            }

            const btnText = ui.submitBtn.querySelector('.btn-text');
            if(btnText) btnText.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar Avaliação';
            ui.submitBtn.classList.add('update-btn');
            ui.submitBtn.classList.remove('submit-btn');
            
            ui.rankingModal.classList.remove('active');
            ui.form.scrollIntoView({ behavior: 'smooth' });
            calculateScore();
        } catch (error) {
            console.error("Erro ao carregar para edição:", error);
            showNotification('Não foi possível carregar os dados para edição.', 'error');
        }
    };
    
    // CORREÇÃO: Nova função de renderização do Dashboard
    const renderCharts = async () => {
        // Limpa gráficos antigos
        Object.values(appState.chartInstances).forEach(chart => chart?.destroy());
        
        // Limpa containers de HTML
        if (ui.kpiWidgetContainer) ui.kpiWidgetContainer.innerHTML = '<div class="kpi-card"><span class="kpi-value">...</span><span class="kpi-label">Carregando...</span></div>';
        if (ui.medalBoardContainer) ui.medalBoardContainer.innerHTML = '<div class="medal-column gold"><h3>🥇 Salas Ouro</h3><ul><li>...</li></ul></div><div class="medal-column silver"><h3>🥈 Salas Prata</h3><ul><li>...</li></ul></div><div class="medal-column bronze"><h3>🥉 Salas Bronze</h3><ul><li>...</li></ul></div>';

        // Pega os elementos <canvas> do DOM *depois* de abrir o modal
        const rankingCanvas = document.getElementById('rankingChart');
        const worstItemsCanvas = document.getElementById('worstItemsChart');

        // Se os elementos não existirem (modal fechado ou HTML antigo), não faz nada
        if (!rankingCanvas || !worstItemsCanvas) {
            console.error("Elementos <canvas> do dashboard ('rankingChart' ou 'worstItemsChart') não encontrados. Verifique seu index.html.");
            showNotification("Falha ao carregar o dashboard. Layout inválido.", "error");
            return; 
        }

        try {
            // Chama a função SQL V3
            const { data, error } = await supabaseClient.rpc('get_dashboard_data_v3');
            
            if (error) {
                // O erro 404 (Not Found) da sua imagem [cite: image_eba7e8.png] será pego aqui
                console.error("Erro ao chamar RPC 'get_dashboard_data_v3':", error);
                throw new Error(error.message || "Função RPC 'get_dashboard_data_v3' não encontrada.");
            }
            if (!data) {
                 showNotification("Não há dados suficientes para gerar gráficos.", "info");
                 // Limpa os "Carregando..."
                 if (ui.kpiWidgetContainer) ui.kpiWidgetContainer.innerHTML = '';
                 if (ui.medalBoardContainer) ui.medalBoardContainer.innerHTML = '';
                 return;
            };
    
            const chartColors = { 
                primary: getCssVariable('--klin-primary-vibrant'), 
                secondary: getCssVariable('--klin-primary-deep'), 
                danger: getCssVariable('--danger-color'), 
                warning: getCssVariable('--warning-color'),
                primaryOpacity: getCssVariable('--klin-primary-vibrant') + 'B3',
                dangerOpacity: getCssVariable('--danger-color') + 'B3',
                warningOpacity: getCssVariable('--warning-color') + 'B3',
                secondaryOpacity: getCssVariable('--klin-primary-deep') + 'B3',
                gold: '#FFD700',
                silver: '#C0C0C0',
                bronze: '#CD7F32'
            };
            Chart.defaults.font.family = "'Inter', sans-serif"; 
            Chart.defaults.color = getCssVariable('--text-secondary'); 

            // --- Widget 1: KPIs ---
            const kpiData = data.kpis;
            if (ui.kpiWidgetContainer && kpiData) {
                ui.kpiWidgetContainer.innerHTML = `
                    <div class="kpi-card">
                        <span class="kpi-value">${kpiData.average_score.toFixed(1)}</span>
                        <span class="kpi-label">Pontuação Média Geral</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-value">${kpiData.success_rate.toFixed(0)}%</span>
                        <span class="kpi-label">Taxa de Sucesso (Ouro/Prata)</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-value">${kpiData.total_sectors_evaluated}</span>
                        <span class="kpi-label">Salas Avaliadas</span>
                    </div>
                `;
            }

            // --- Widget 2: Pódio (Quadro de Medalhas) ---
            const medalData = data.medal_lists;
            if (ui.medalBoardContainer && medalData) {
                const createList = (list) => (list && list.length) ? list.map(item => `<li>${sanitizeHTML(item)}</li>`).join('') : '<li>Nenhuma</li>';
                
                ui.medalBoardContainer.innerHTML = `
                    <div class="medal-column gold">
                        <h3>🥇 Salas Ouro (20 pts)</h3>
                        <ul>${createList(medalData.gold)}</ul>
                    </div>
                    <div class="medal-column silver">
                        <h3>🥈 Salas Prata (14-19 pts)</h3>
                        <ul>${createList(medalData.silver)}</ul>
                    </div>
                    <div class="medal-column bronze">
                        <h3>🥉 Salas Bronze (<14 pts)</h3>
                        <ul>${createList(medalData.bronze)}</ul>
                    </div>
                `;
            }

            // --- Widget 3: Top 5 Piores (Gráfico de Barras Horizontais) ---
            const rankingData = data.worst_5_sectors;
            if (rankingCanvas && rankingData) {
                const labels = rankingData.map(d => d.name);
                const scores = rankingData.map(d => d.average_score.toFixed(1));
                
                appState.chartInstances.rankingChart = new Chart(rankingCanvas, { 
                    type: 'bar', 
                    data: { 
                        labels: labels, 
                        datasets: [{ 
                            label: 'Pontuação Média', 
                            data: scores, 
                            backgroundColor: chartColors.dangerOpacity,
                            borderColor: chartColors.danger,
                            borderWidth: 1
                        }] 
                    }, 
                    options: { 
                        indexAxis: 'y', // <-- Torna o gráfico horizontal
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                            legend: { display: false },
                            title: { display: false }
                        },
                        scales: {
                            x: { max: 20 } // Define a escala máxima em 20
                        }
                    } 
                });
            }
    
            // --- Widget 4: Maiores Problemas (Gráfico de Pizza) ---
            const worstItemsData = data.worst_items;
            if (worstItemsCanvas && worstItemsData) {
                const pieLabels = Object.keys(worstItemsData);
                const pieData = Object.values(worstItemsData);
                appState.chartInstances.worstItems = new Chart(worstItemsCanvas, { 
                    type: 'pie', 
                    data: { 
                        labels: pieLabels, 
                        datasets: [{ 
                            data: pieData, 
                            backgroundColor: [
                                chartColors.dangerOpacity, 
                                chartColors.warningOpacity, 
                                chartColors.secondaryOpacity, 
                                chartColors.primaryOpacity
                            ] 
                        }] 
                    }, 
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                            title: { display: false } 
                        } 
                    } 
                });
            }

        } catch (error) {
            console.error("Erro ao renderizar gráficos:", error);
            showNotification("Não foi possível carregar os dados do dashboard.", "error");
        }
    };

    // ATUALIZADO: exportToXls (para incluir rastreio)
    const exportToXls = async () => {
        toggleButtonLoading(ui.exportBtn, true);
        try {
            const { data: evaluations, error } = await supabaseClient
                .from('evaluations')
                .select('*, sectors(name), profiles(email)') 
                .is('deleted_at', null) 
                .order('score', { ascending: false });
                
            if (error) throw error;
            if (!evaluations || evaluations.length === 0) {
                return showNotification("Não há dados para exportar.", 'warning');
            }
            
            const dataForSheet = evaluations.map((ev, index) => ({
                'Posição': index + 1, 
                'Setor/Sala': ev.sectors ? ev.sectors.name : 'Setor Inválido', 
                'Responsável': ev.responsible || '', 
                'Pontuação': ev.score,
                'Data da Avaliação': new Date(ev.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                'Avaliador (Digitado)': ev.evaluator, 
                'Observações': ev.observations || '',
                // CAMPOS DE RASTREIO (QUEM E QUANDO)
                'Data de Cadastro': new Date(ev.created_at).toLocaleString('pt-BR', { timeZone: 'UTC' }),
                'Cadastrado Por (Email)': ev.profiles ? ev.profiles.email : (ev.created_by || 'Desconhecido') 
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Avaliações");
            worksheet['!cols'] = Object.keys(dataForSheet[0]).map(key => ({ wch: Math.max(key.length, ...dataForSheet.map(row => String(row[key] || '').length)) + 2 }));
            XLSX.writeFile(workbook, "Ranking_Segregacao_Residuos.xlsx");
        } catch (error) {
            console.error("Erro ao exportar:", error);
            showNotification('Não foi possível exportar os dados.', 'error');
        } finally {
            toggleButtonLoading(ui.exportBtn, false);
        }
    };

    const logoutDueToInactivity = () => {
        showNotification("Foi desconectado por inatividade.", "warning");
        handleLogout(); // Chama a função de logout corrigida
    };

    const resetInactivityTimer = () => {
        clearTimeout(appState.inactivityTimer);
        appState.inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS);
    };

    // ATUALIZADO: setupEventListeners
    const setupEventListeners = () => {
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('.close-button')) target.closest('.modal').classList.remove('active');
            if (target.matches('.modal')) target.classList.remove('active');
        });
        
        ui.loginForm.addEventListener('submit', handleLogin);
        ui.logoutBtn.addEventListener('click', handleLogout);
        ui.forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            ui.forgotPasswordForm.reset();
            ui.recoveryError.textContent = '';
            ui.forgotPasswordModal.classList.add('active');
        });
        ui.forgotPasswordForm.addEventListener('submit', handleForgotPassword);
        
        ui.form.addEventListener('submit', handleFormSubmit);
        ui.form.addEventListener('change', calculateScore);
        ui.clearBtn.addEventListener('click', () => {
            showConfirmation('Limpar Formulário?', 'Todos os dados não guardados serão perdidos.', resetFormMode, 'Limpar', 'warning-btn');
        });
        
        ui.sectorSelect.addEventListener('change', handleSectorChange);

        ui.openRankingBtn.addEventListener('click', () => {
            ui.rankingFilter.value = '';
            displayResults(1);
            ui.rankingModal.classList.add('active');
        });
        ui.openDashboardBtn.addEventListener('click', () => {
            ui.dashboardModal.classList.add('active');
            // Renderiza os gráficos *depois* que o modal estiver visível
            // para garantir que os <canvas> existam.
            setTimeout(renderCharts, 10); 
        });
        
        ui.rankingFilter.addEventListener('input', () => {
            clearTimeout(appState.searchDebounceTimer);
            appState.searchDebounceTimer = setTimeout(() => displayResults(1, ui.rankingFilter.value.trim()), 400);
        });
        
        ui.resultsBody.addEventListener('click', (e) => {
            const button = e.target.closest('.action-icon-btn');
            if (!button) return;
            const id = button.dataset.id; 
            
            if (appState.userRole !== 'admin') return; 

            if (button.classList.contains('delete')) handleDelete(id);
            if (button.classList.contains('edit')) handleEdit(id);
            if (button.classList.contains('restore')) handleRestore(id); 
        });
        
        ui.exportBtn.addEventListener('click', exportToXls);
        ui.prevPageBtn.addEventListener('click', () => { if (appState.currentPage > 1) displayResults(appState.currentPage - 1, ui.rankingFilter.value.trim()); });
        ui.nextPageBtn.addEventListener('click', () => { if (ui.nextPageBtn.disabled === false) displayResults(appState.currentPage + 1, ui.rankingFilter.value.trim()); });
        
        ui.resetDbBtn.addEventListener('click', () => {
            showConfirmation("Limpar Base de Dados?", "ATENÇÃO: AÇÃO IRREVERSÍVEL! Todos os registos de avaliação serão apagados.", async () => {
                ui.confirmModal.classList.remove('active'); 
                try {
                    const { error } = await supabaseClient.rpc('delete_all_evaluations');
                    if (error) throw error;
                    showNotification("Base de dados limpa com sucesso!", "warning");
                    displayResults(1, '');
                } catch (error) {
                    console.error("Erro ao limpar BD:", error);
                    showNotification(`Não foi possível limpar a base de dados. ${error.message}`, 'error');
                }
            }, 'SIM, APAGAR TUDO', 'danger-btn');
        });
        
        ui.confirmCancelBtn.addEventListener('click', () => ui.confirmModal.classList.remove('active'));
        
        ui.confirmOkBtn.addEventListener('click', () => { 
            appState.currentConfirmCallback?.();
            ui.confirmModal.classList.remove('active');
        });
    
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => window.addEventListener(event, resetInactivityTimer));
    
        const loginTogglePassword = document.querySelector('#login-form .toggle-password');
        if (loginTogglePassword) {
            loginTogglePassword.addEventListener('click', () => {
                const targetId = loginTogglePassword.dataset.target;
                const input = document.getElementById(targetId);
                if (input && input.type === 'password') {
                    input.type = 'text';
                    loginTogglePassword.classList.replace('fa-eye', 'fa-eye-slash');
                } else if (input) {
                    input.type = 'password';
                    loginTogglePassword.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        }
    };

    // --- LÓGICA DE TEMA (DARK/LIGHT MODE) ---
    const themeToggle = {
        btn: document.getElementById('theme-toggle-btn'),
        iconDark: document.querySelector('#theme-toggle-btn .icon-dark'),
        iconLight: document.querySelector('#theme-toggle-btn .icon-light'),

        init() {
            if (!this.btn) return;
            const savedTheme = localStorage.getItem('klin-theme') || 'light';
            this.applyTheme(savedTheme);
            this.btn.addEventListener('click', () => this.toggle());
        },

        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('klin-theme', theme);
            if (theme === 'dark') {
                this.iconDark.style.display = 'none';
                this.iconLight.style.display = 'block';
            } else {
                this.iconDark.style.display = 'block';
                this.iconLight.style.display = 'none';
            }
        },

        toggle() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
        }
    };
    
    // --- INICIALIZAÇÃO ---
    setupEventListeners();
    themeToggle.init();
})();

