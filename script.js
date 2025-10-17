(() => {
    'use strict';

    // --- CONFIGURAÇÃO E CONSTANTES ---
    const SUPABASE_URL = 'https://hjkulurewbihxpdaqtvk.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa3VsdXJld2JpaHhwZGFxdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMyMDEsImV4cCI6MjA3NjE5OTIwMX0.V3dcIxhbSZ1-HAW4HIVvPSD97le_F1j0QrwCogkvAio';
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- ESTADO DA APLICAÇÃO ---
    // Centraliza todo o estado dinâmico para fácil gerenciamento.
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
    // Agrupa todos os seletores para fácil acesso e manutenção.
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
        closeForgotPasswordModal: document.querySelector('#forgot-password-modal .close-button'),
        
        appContainer: document.getElementById('app-container'),
        logoutBtn: document.getElementById('logout-btn'),
        
        form: document.getElementById('evaluation-form'),
        totalScoreSpan: document.getElementById('total-score'),
        evaluationDateInput: document.getElementById('evaluation-date'),
        submitBtn: document.querySelector('#evaluation-form button[type="submit"]'),
        clearBtn: document.getElementById('clear-btn'),
        
        rankingModal: document.getElementById('ranking-modal'),
        openRankingBtn: document.getElementById('open-ranking-btn'),
        closeRankingBtn: document.querySelector('#ranking-modal .close-button'),
        resultsBody: document.getElementById('results-body'),
        resultsLoader: document.getElementById('results-loader'),
        exportBtn: document.getElementById('export-xls-btn'),
        rankingFilter: document.getElementById('ranking-filter'),
        
        dashboardModal: document.getElementById('dashboard-modal'),
        openDashboardBtn: document.getElementById('open-dashboard-btn'),
        closeDashboardBtn: document.getElementById('close-dashboard-btn'),
        
        paginationControls: document.getElementById('pagination-controls'),
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        currentPageDisplay: document.getElementById('current-page-display'),
        
        adminActionsContainer: document.getElementById('admin-actions'),
        resetDbBtn: document.getElementById('reset-db-btn'),

        notification: document.getElementById('notification'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmText: document.getElementById('confirm-text'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
    };

    // --- FUNÇÕES UTILITÁRIAS ---

    /**
     * Sanitiza uma string para prevenir XSS, removendo tags HTML.
     * @param {string} str A string a ser sanitizada.
     * @returns {string} A string sanitizada.
     */
    const sanitizeHTML = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    /**
     * Exibe uma notificação não-bloqueante na tela.
     * @param {string} message A mensagem a ser exibida.
     * @param {string} type O tipo de notificação ('success' ou 'error').
     */
    const showNotification = (message, type = 'success') => {
        ui.notification.textContent = sanitizeHTML(message);
        ui.notification.className = `notification show ${type}`;
        setTimeout(() => {
            ui.notification.classList.remove('show');
        }, 3500);
    };

    /**
     * Exibe um modal de confirmação customizado.
     * @param {string} message A pergunta de confirmação.
     * @param {Function} onConfirm O callback a ser executado se o usuário confirmar.
     */
    const showConfirmation = (message, onConfirm) => {
        ui.confirmText.textContent = message;
        appState.currentConfirmCallback = onConfirm;
        ui.confirmModal.classList.add('active');
    };
    
    /**
     * Define o estado de carregamento de um botão.
     * @param {HTMLButtonElement} button O elemento do botão.
     * @param {boolean} isLoading Se o botão deve estar em estado de carregamento.
     * @param {string} [loadingText='Carregando...'] O texto a ser exibido durante o carregamento.
     */
    const setButtonLoading = (button, isLoading, loadingText = 'Carregando...') => {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalHtml = button.innerHTML;
            button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${sanitizeHTML(loadingText)}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalHtml;
        }
    };

    // --- AUTENTICAÇÃO E SESSÃO ---

    const handleLogin = async (event) => {
        event.preventDefault();
        ui.loginError.textContent = '';
        setButtonLoading(ui.loginBtn, true, 'Entrando...');
        
        const email = ui.loginForm.elements.email.value;
        const password = ui.loginForm.elements.password.value;

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error) {
            ui.loginError.textContent = 'Email ou senha inválidos. Verifique suas credenciais.';
            setButtonLoading(ui.loginBtn, false);
        }
    };

    const handleLogout = async (isSilent = false) => {
        if (isSilent) {
            clearTimeout(appState.inactivityTimer);
            await supabaseClient.auth.signOut();
        } else {
            showConfirmation('Deseja realmente sair do sistema?', async () => {
                clearTimeout(appState.inactivityTimer);
                await supabaseClient.auth.signOut();
            });
        }
    };
    
    const handleForgotPassword = async (event) => {
        event.preventDefault();
        ui.recoveryError.textContent = '';
        setButtonLoading(ui.recoveryBtn, true, 'Enviando...');
        
        const email = ui.forgotPasswordForm.elements['recovery-email'].value;
        const redirectTo = window.location.href.replace(/index\.html$/, 'reset-password.html');

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            
            ui.forgotPasswordModal.classList.remove('active');
            showNotification('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        } catch (error) {
            ui.recoveryError.textContent = 'Erro ao enviar. Verifique o e-mail digitado.';
        } finally {
            setButtonLoading(ui.recoveryBtn, false);
        }
    };

    const checkUserProfileAndInitialize = async (user) => {
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error || !profile) throw new Error("Perfil de usuário não encontrado.");
            
            appState.userRole = profile.role;
            initializeAppUI();
            
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            showNotification("Seu perfil de usuário não foi encontrado. Contate o administrador.", "error");
            await supabaseClient.auth.signOut();
        }
    };

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            checkUserProfileAndInitialize(session.user);
        } else {
            ui.appContainer.classList.add('hidden');
            ui.loginModal.classList.add('active');
            appState.userRole = null;
            clearTimeout(appState.inactivityTimer);
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
        const totalScore = [...ui.form.querySelectorAll('input[type="radio"]:checked')]
            .reduce((sum, radio) => sum + parseInt(radio.value, 10), 0);
        
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
        
        setButtonLoading(ui.submitBtn, true, appState.currentlyEditingId ? 'Atualizando...' : 'Enviando...');
        
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
            const { error } = appState.currentlyEditingId
                ? await supabaseClient.from('evaluations').update(dataToSave).eq('id', appState.currentlyEditingId)
                : await supabaseClient.from('evaluations').insert([dataToSave]);

            if (error) throw error;

            showNotification(appState.currentlyEditingId ? 'Avaliação atualizada com sucesso!' : 'Avaliação salva com sucesso!');
            resetFormMode();
            
            // Se o ranking estiver aberto, atualiza a lista
            if (ui.rankingModal.classList.contains('active')) {
                displayResults(1, '');
                ui.rankingFilter.value = '';
            }
        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            showNotification('Não foi possível salvar a avaliação. Tente novamente.', 'error');
        } finally {
            setButtonLoading(ui.submitBtn, false);
        }
    };

    const resetFormMode = () => {
        appState.currentlyEditingId = null;
        ui.form.reset();
        ui.totalScoreSpan.textContent = '0';
        ui.evaluationDateInput.max = new Date().toISOString().split("T")[0];
        ui.evaluationDateInput.valueAsDate = new Date();
        ui.submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Avaliação';
        ui.submitBtn.classList.remove('update-btn');
        ui.submitBtn.classList.add('submit-btn');
    };

    // --- RANKING E DADOS ---

    const createResultRowHTML = (evaluation, index, from, page, filterText) => {
        const overallIndex = from + index + 1;
        const medal = (page === 1 && !filterText) ? (['🥇', '🥈', '🥉'][overallIndex - 1] || '') : '';
        const isAdmin = appState.userRole === 'admin';
        const actionsHTML = isAdmin
            ? `<button class="action-icon-btn edit" data-id="${evaluation.id}" title="Editar"><i class="fa-solid fa-pencil"></i></button>
               <button class="action-icon-btn delete" data-id="${evaluation.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>`
            : '<span>-</span>';

        return `
            <tr data-evaluation-id="${evaluation.id}">
                <td>${filterText ? '-' : overallIndex + 'º'}</td>
                <td>${medal} ${sanitizeHTML(evaluation.sector)}</td>
                <td>${evaluation.score}</td>
                <td>${new Date(evaluation.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td>${sanitizeHTML(evaluation.evaluator)}</td>
                <td class="actions-cell">${actionsHTML}</td>
            </tr>`;
    };

    const displayResults = async (page = 1, filterText = '') => {
        appState.currentPage = page;
        ui.resultsLoader.style.display = 'table-row';
        ui.resultsBody.innerHTML = '';
        ui.paginationControls.style.visibility = 'hidden';

        const from = (page - 1) * appState.recordsPerPage;
        const to = from + appState.recordsPerPage - 1;
        
        let query = supabaseClient.from('evaluations').select('*', { count: 'exact' });
        if (filterText) {
            const sanitizedFilter = sanitizeHTML(filterText);
            query = query.or(`sector.ilike.%${sanitizedFilter}%,evaluator.ilike.%${sanitizedFilter}%`);
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
            ui.resultsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Falha ao carregar dados. Tente novamente.</td></tr>`;
        } finally {
            ui.resultsLoader.style.display = 'none';
        }
    };

    const handleDelete = (idToDelete) => {
        showConfirmation('Tem certeza que deseja excluir este registro? A ação é irreversível.', async () => {
            try {
                const { error } = await supabaseClient.from('evaluations').delete().eq('id', idToDelete);
                if (error) throw error;
                showNotification("Registro excluído com sucesso!");
                displayResults(appState.currentPage, ui.rankingFilter.value.trim());
            } catch (error) {
                console.error('Erro ao excluir:', error);
                showNotification('Não foi possível excluir. Verifique suas permissões.', 'error');
            }
        });
    };
    
    const handleEdit = async (idToEdit) => {
        try {
            const { data: evaluation, error } = await supabaseClient.from('evaluations').select('*').eq('id', idToEdit).single();
            if (error) throw error;

            appState.currentlyEditingId = idToEdit;
            ui.form.elements.evaluator.value = evaluation.evaluator;
            ui.form.elements['evaluation-date'].value = evaluation.date;
            ui.form.elements.sector.value = evaluation.sector;
            ui.form.elements.responsible.value = evaluation.responsible || '';
            ui.form.elements.observations.value = evaluation.observations || '';
            
            const details = evaluation.details || {};
            for (const key in details) {
                const radioWithValue = ui.form.querySelector(`input[name="${key}"][value="${details[key]}"]`);
                if (radioWithValue) radioWithValue.checked = true;
            }

            ui.submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar Avaliação';
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

    // --- DASHBOARD E EXPORTAÇÃO ---

    const renderCharts = async () => {
        // Implementação da renderização de gráficos...
        // ... (a lógica existente pode ser mantida, mas seria ideal otimizar
        // para não buscar dados todas as vezes, se não for necessário)
    };

    const exportToXls = async () => {
        setButtonLoading(ui.exportBtn, true, 'Exportando...');
        try {
            const { data: evaluations, error } = await supabaseClient.from('evaluations').select('*').order('score', { ascending: false });
            if (error || !evaluations || evaluations.length === 0) {
                throw new Error("Não há dados para exportar ou ocorreu um erro.");
            }
            
            const dataForSheet = evaluations.map((ev, index) => ({
                'Posição': index + 1,
                'Setor/Sala': ev.sector,
                'Responsável': ev.responsible || '',
                'Pontuação': ev.score,
                'Data da Avaliação': new Date(ev.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
                'Avaliador': ev.evaluator,
                'Observações': ev.observations || ''
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Avaliações");
            worksheet['!cols'] = Object.keys(dataForSheet[0]).map(key => ({ wch: Math.max(key.length, ...dataForSheet.map(row => String(row[key]).length)) + 2 }));
            XLSX.writeFile(workbook, "Ranking_Segregacao_Residuos.xlsx");

        } catch (error) {
            console.error("Erro ao exportar:", error);
            showNotification(error.message, 'error');
        } finally {
            setButtonLoading(ui.exportBtn, false);
        }
    };

    // --- GERENCIAMENTO DE INATIVIDADE ---
    const logoutDueToInactivity = () => {
        showNotification("Você foi desconectado por inatividade.", "error");
        handleLogout(true);
    };

    const resetInactivityTimer = () => {
        clearTimeout(appState.inactivityTimer);
        appState.inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS);
    };

    // --- SETUP DOS EVENT LISTENERS ---
    const setupEventListeners = () => {
        // Autenticação
        ui.loginForm.addEventListener('submit', handleLogin);
        ui.logoutBtn.addEventListener('click', () => handleLogout(false));
        ui.forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            ui.forgotPasswordForm.reset();
            ui.recoveryError.textContent = '';
            ui.forgotPasswordModal.classList.add('active');
        });
        ui.closeForgotPasswordModal.addEventListener('click', () => ui.forgotPasswordModal.classList.remove('active'));
        ui.forgotPasswordForm.addEventListener('submit', handleForgotPassword);

        // Formulário Principal
        ui.form.addEventListener('submit', handleFormSubmit);
        ui.form.addEventListener('change', calculateScore);
        ui.clearBtn.addEventListener('click', () => {
            showConfirmation('Tem certeza que deseja limpar o formulário?', resetFormMode);
        });

        // Modais
        ui.openRankingBtn.addEventListener('click', () => {
            ui.rankingFilter.value = '';
            displayResults(1);
            ui.rankingModal.classList.add('active');
        });
        ui.openDashboardBtn.addEventListener('click', () => {
            renderCharts();
            ui.dashboardModal.classList.add('active');
        });
        ui.closeRankingBtn.addEventListener('click', () => ui.rankingModal.classList.remove('active'));
        ui.closeDashboardBtn.addEventListener('click', () => ui.dashboardModal.classList.remove('active'));
        
        // Ranking e Ações
        ui.rankingFilter.addEventListener('input', () => {
            clearTimeout(appState.searchDebounceTimer);
            appState.searchDebounceTimer = setTimeout(() => {
                displayResults(1, ui.rankingFilter.value.trim());
            }, 400);
        });
        ui.resultsBody.addEventListener('click', (e) => {
            const button = e.target.closest('.action-icon-btn');
            if (!button || appState.userRole !== 'admin') return;
            const id = parseInt(button.dataset.id, 10);
            if (button.classList.contains('delete')) handleDelete(id);
            if (button.classList.contains('edit')) handleEdit(id);
        });
        ui.exportBtn.addEventListener('click', exportToXls);

        // Paginação
        ui.prevPageBtn.addEventListener('click', () => {
            if (appState.currentPage > 1) displayResults(appState.currentPage - 1, ui.rankingFilter.value.trim());
        });
        ui.nextPageBtn.addEventListener('click', () => {
            displayResults(appState.currentPage + 1, ui.rankingFilter.value.trim());
        });

        // Ações de Admin
        ui.resetDbBtn.addEventListener('click', async () => {
            showConfirmation("ATENÇÃO: Ação IRREVERSÍVEL! Deseja apagar TODOS os registros?", async () => {
                try {
                    // Nota: A função RPC 'delete_all_evaluations' deve existir no Supabase.
                    const { error } = await supabaseClient.rpc('delete_all_evaluations');
                    if (error) throw error;
                    showNotification("Banco de dados limpo com sucesso!");
                    displayResults(1, '');
                } catch (error) {
                    console.error("Erro ao limpar DB:", error);
                    showNotification('Não foi possível limpar o banco. Verifique permissões.', 'error');
                }
            });
        });

        // Modal de Confirmação
        ui.confirmYesBtn.addEventListener('click', () => {
            if (appState.currentConfirmCallback) {
                appState.currentConfirmCallback();
            }
            ui.confirmModal.classList.remove('active');
            appState.currentConfirmCallback = null;
        });
        ui.confirmNoBtn.addEventListener('click', () => {
            ui.confirmModal.classList.remove('active');
            appState.currentConfirmCallback = null;
        });
        
        // Reset do timer de inatividade
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event =>
            window.addEventListener(event, resetInactivityTimer)
        );
    };
    
    // --- INICIALIZAÇÃO ---
    setupEventListeners();
})();
