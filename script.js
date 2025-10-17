(() => {
    'use strict';

    // --- CONFIGURAÇÃO E CONSTANTES ---
    const SUPABASE_URL = 'https://hjkulurewbihxpdaqtvk.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa3VsdXJld2JpaHhwZGFxdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMyMDEsImV4cCI6MjA3NjE5OTIwMX0.V3dcIxhbSZ1-HAW4HIVvPSD97le_F1j0QrwCogkvAio';
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- ESTADO DA APLICAÇÃO ---
    const appState = {
        userRole: null,
        currentlyEditingId: null,
        currentPage: 1,
        recordsPerPage: 10,
        chartInstances: {},
        searchDebounceTimer: null,
        inactivityTimer: null,
        currentConfirmCallback: null,
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
            // O onAuthStateChange cuidará do resto
        } catch (error) {
            ui.loginError.textContent = 'Email ou senha inválidos.';
            toggleButtonLoading(ui.loginBtn, false);
        }
    };

    const handleLogout = async () => {
        showConfirmation('Sair do Sistema', 'Deseja realmente sair?', async () => {
            ui.confirmModal.classList.remove('active');
            clearTimeout(appState.inactivityTimer);
            await supabaseClient.auth.signOut();
        }, 'Sair', 'danger-btn');
    };
    
    const handleForgotPassword = async (event) => {
        event.preventDefault();
        ui.recoveryError.textContent = '';
        toggleButtonLoading(ui.recoveryBtn, true);
        const email = ui.forgotPasswordForm.elements['recovery-email'].value;
        const redirectTo = 'https://alissonaraujo0528.github.io/Segrega-o-de-Res-duos---Col-gio-Santa-Am-lia/reset-password.html';
        console.log('Solicitando redefinição de senha. A URL de redirecionamento gerada é:', redirectTo);
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
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
            if (error || !profile) {
                throw new Error("Perfil de usuário não foi encontrado na base de dados.");
            }
            
            appState.userRole = profile.role;
            initializeAppUI();

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
            clearTimeout(appState.inactivityTimer);
            toggleButtonLoading(ui.loginBtn, false);
        }
    });
    
    // --- LÓGICA PRINCIPAL DA APLICAÇÃO ---

    const initializeAppUI = () => {
        ui.loginModal.classList.remove('active');
        ui.appContainer.classList.remove('hidden');
        ui.evaluationDateInput.max = new Date().toISOString().split("T")[0];
        ui.evaluationDateInput.valueAsDate = new Date();
        ui.adminActionsContainer.style.display = appState.userRole === 'admin' ? 'block' : 'none';
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
        const sector = ui.form.elements.sector.value.trim();
        if (!evaluator || !sector) {
            return showNotification('Os campos "Avaliador" e "Setor/Sala" são obrigatórios.', 'error');
        }
        toggleButtonLoading(ui.submitBtn, true);
        const dataToSave = {
            date: ui.evaluationDateInput.value,
            evaluator: sanitizeHTML(evaluator),
            sector: sanitizeHTML(sector),
            score: parseInt(ui.totalScoreSpan.textContent, 10),
            details: {
                organicos: ui.form.elements.organicos.value,
                sanitarios: ui.form.elements.sanitarios.value,
                outros: ui.form.elements.outros.value,
                nivel: ui.form.elements.nivel.value
            },
            responsible: sanitizeHTML(ui.form.elements.responsible.value.trim()),
            observations: sanitizeHTML(ui.form.elements.observations.value.trim())
        };
        try {
            const query = appState.currentlyEditingId ?
                supabaseClient.from('evaluations').update(dataToSave).eq('id', appState.currentlyEditingId) :
                supabaseClient.from('evaluations').insert([dataToSave]);
            const { error } = await query;
            if (error) throw error;
            showNotification(appState.currentlyEditingId ? 'Avaliação atualizada com sucesso!' : 'Avaliação guardada com sucesso!');
            resetFormMode();
            if (ui.rankingModal.classList.contains('active')) {
                displayResults(appState.currentPage, ui.rankingFilter.value.trim());
            }
        } catch (error) {
            console.error('Erro ao guardar avaliação:', error);
            showNotification(`Não foi possível guardar a avaliação. ${error.message}`, 'error');
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
        return `
            <tr data-evaluation-id="${evaluation.id}">
                <td>${filterText ? '-' : overallIndex + 'º'}</td>
                <td>${medal} ${sanitizeHTML(evaluation.sector)}</td>
                <td>${evaluation.score}</td>
                <td>${new Date(evaluation.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td>${sanitizeHTML(evaluation.evaluator)}</td>
                <td class="actions-cell">
                    ${isAdmin ? `
                        <button class="action-icon-btn edit" data-id="${evaluation.id}" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                        <button class="action-icon-btn delete" data-id="${evaluation.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
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
        
        let query = supabaseClient.from('evaluations').select('*', { count: 'exact' });
        if (filterText) {
            query = query.or(`sector.ilike.%${filterText}%,evaluator.ilike.%${filterText}%`);
        }

        try {
            const { data: evaluations, error, count } = await query.order('score', { ascending: false }).range(from, to);
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
        showConfirmation('Excluir Registo', 'Tem a certeza que deseja excluir este registo? A ação é irreversível.', async () => {
            ui.confirmModal.classList.remove('active');
            try {
                const { error } = await supabaseClient.from('evaluations').delete().eq('id', idToDelete);
                if (error) throw error;
                showNotification("Registo excluído com sucesso!");
                displayResults(appState.currentPage, ui.rankingFilter.value.trim());
            } catch (error) {
                console.error('Erro ao excluir:', error);
                showNotification(`Não foi possível excluir. ${error.message}`, 'error');
            }
        }, 'Excluir', 'danger-btn');
    };
    
    const handleEdit = async (idToEdit) => {
        try {
            const { data: evaluation, error } = await supabaseClient.from('evaluations').select('*').eq('id', idToEdit).single();
            if (error) throw error;

            appState.currentlyEditingId = idToEdit;
            Object.keys(evaluation).forEach(key => {
                const el = ui.form.elements[key];
                if (el && key !== 'details') el.value = evaluation[key] || '';
            });
            ui.form.elements['evaluation-date'].value = evaluation.date;

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
    
    const renderCharts = async () => {
        try {
            const { data: evaluations, error } = await supabaseClient.from('evaluations').select('sector, score, date, details');
            if (error) throw error;
            if (!evaluations || evaluations.length === 0) {
                 showNotification("Não há dados suficientes para gerar gráficos.", "info");
                 return;
            };
    
            Object.values(appState.chartInstances).forEach(chart => chart?.destroy());
    
            const chartColors = { primary: 'rgba(0, 90, 156, 0.7)', secondary: 'rgba(86, 61, 124, 0.8)', danger: 'rgba(220, 53, 69, 0.7)', warning: 'rgba(255, 193, 7, 0.7)' };
            Chart.defaults.font.family = "'Poppins', sans-serif";
    
            const sectorData = evaluations.reduce((acc, { sector, score }) => {
                acc[sector] = acc[sector] || { totalScore: 0, count: 0 };
                acc[sector].totalScore += score;
                acc[sector].count++;
                return acc;
            }, {});
            const barLabels = Object.keys(sectorData);
            const barData = barLabels.map(sector => (sectorData[sector].totalScore / sectorData[sector].count).toFixed(2));
            appState.chartInstances.scoreBySector = new Chart(document.getElementById('scoreBySectorChart'), { type: 'bar', data: { labels: barLabels, datasets: [{ label: 'Pontuação Média', data: barData, backgroundColor: chartColors.primary }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Pontuação Média por Setor/Sala', font: { size: 16 } } } } });
    
            const timeData = evaluations.reduce((acc, { date, score }) => {
                const dateKey = new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                acc[dateKey] = acc[dateKey] || { totalScore: 0, count: 0 };
                acc[dateKey].totalScore += score;
                acc[dateKey].count++;
                return acc;
            }, {});
            const lineLabels = Object.keys(timeData).sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
            const lineData = lineLabels.map(date => (timeData[date].totalScore / timeData[date].count).toFixed(2));
            appState.chartInstances.scoreOverTime = new Chart(document.getElementById('scoreOverTimeChart'), { type: 'line', data: { labels: lineLabels, datasets: [{ label: 'Pontuação Média Diária', data: lineData, borderColor: chartColors.secondary, tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Evolução da Pontuação Média', font: { size: 16 } } } } });
    
            const worstItemsCounter = evaluations.reduce((acc, { details }) => {
                if (details) {
                    if (details.organicos === '2') acc['Orgânicos Misturados']++;
                    if (details.sanitarios === '2') acc['Papéis Sanitários']++;
                    if (details.outros === '2') acc['Outros Não Recicláveis']++;
                    if (details.nivel === '2') acc['Nível dos Coletores']++;
                }
                return acc;
            }, { 'Orgânicos Misturados': 0, 'Papéis Sanitários': 0, 'Outros Não Recicláveis': 0, 'Nível dos Coletores': 0 });
            const pieLabels = Object.keys(worstItemsCounter);
            const pieData = Object.values(worstItemsCounter);
            appState.chartInstances.worstItems = new Chart(document.getElementById('worstItemsChart'), { type: 'pie', data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: [chartColors.danger, chartColors.warning, chartColors.secondary, chartColors.primary] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Itens com Pior Desempenho (Contagem de "Regular")', font: { size: 16 } } } } });
        } catch (error) {
            console.error("Erro ao renderizar gráficos:", error);
            showNotification("Não foi possível carregar os dados do dashboard.", "error");
        }
    };

    const exportToXls = async () => {
        toggleButtonLoading(ui.exportBtn, true);
        try {
            const { data: evaluations, error } = await supabaseClient.from('evaluations').select('*').order('score', { ascending: false });
            if (error) throw error;
            if (!evaluations || evaluations.length === 0) {
                return showNotification("Não há dados para exportar.", 'warning');
            }
            const dataForSheet = evaluations.map((ev, index) => ({
                'Posição': index + 1, 'Setor/Sala': ev.sector, 'Responsável': ev.responsible || '', 'Pontuação': ev.score,
                'Data da Avaliação': new Date(ev.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                'Avaliador': ev.evaluator, 'Observações': ev.observations || ''
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
        clearTimeout(appState.inactivityTimer);
        supabaseClient.auth.signOut();
    };

    const resetInactivityTimer = () => {
        clearTimeout(appState.inactivityTimer);
        appState.inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS);
    };

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
        ui.openRankingBtn.addEventListener('click', () => {
            ui.rankingFilter.value = '';
            displayResults(1);
            ui.rankingModal.classList.add('active');
        });
        ui.openDashboardBtn.addEventListener('click', () => {
            renderCharts();
            ui.dashboardModal.classList.add('active');
        });
        ui.rankingFilter.addEventListener('input', () => {
            clearTimeout(appState.searchDebounceTimer);
            appState.searchDebounceTimer = setTimeout(() => displayResults(1, ui.rankingFilter.value.trim()), 400);
        });
        ui.resultsBody.addEventListener('click', (e) => {
            const button = e.target.closest('.action-icon-btn');
            if (!button || appState.userRole !== 'admin') return;
            const id = parseInt(button.dataset.id, 10);
            if (button.classList.contains('delete')) handleDelete(id);
            if (button.classList.contains('edit')) handleEdit(id);
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
        ui.confirmOkBtn.addEventListener('click', () => appState.currentConfirmCallback?.());
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => window.addEventListener(event, resetInactivityTimer));
    };
    
    // --- INICIALIZAÇÃO ---
    setupEventListeners();
})();