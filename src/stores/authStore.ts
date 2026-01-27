import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import { useUiStore } from './uiStore'

// Tempo limite de inatividade (15 minutos)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref<any>(null)
  const userRole = ref<string>('user')
  const loading = ref(true) // Controla o loading inicial da aplicação
  const sessionTimer = ref<any>(null) // Timer para controlar a inatividade
  
  // Acesso à store de UI para abrir modais/toasts
  const uiStore = useUiStore()

  // --- GETTERS ---
  // isAuthReady: Verdadeiro quando o Supabase já respondeu se tem usuário ou não
  const isAuthReady = computed(() => !loading.value)
  // isAuthenticated: Verdadeiro se temos um objeto de usuário válido
  const isAuthenticated = computed(() => !!user.value)

  // --- ACTIONS INTERNAS ---

  /**
   * Busca a Role (papel) do usuário na tabela 'profiles'.
   * Se falhar, assume 'user' por segurança.
   */
  async function fetchUserRole(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        userRole.value = data.role
      }
    } catch (e) {
      console.warn('Erro ao buscar role. Usando fallback "user".', e)
      userRole.value = 'user'
    }
  }

  /**
   * Inicia ou reinicia o timer de inatividade.
   * Chamado quando o usuário interage com o sistema.
   */
  function startInactivityTimer() {
    clearTimeout(sessionTimer.value)
    if (user.value) {
      sessionTimer.value = setTimeout(() => {
        console.log('Sessão expirada por inatividade.')
        uiStore.showToast('Sessão expirada por inatividade.', 'info')
        signOut() // Logout forçado
      }, INACTIVITY_TIMEOUT_MS)
    }
  }

  /**
   * Função pública para resetar o timer (usada pelo Layout/App.vue nos eventos de mouse)
   */
  function resetTimer() {
    if (user.value) startInactivityTimer()
  }

  // --- ACTIONS PÚBLICAS (usadas pelos componentes) ---

  /**
   * Inicializa a autenticação. Chamado pelo Router ou App.vue no mount.
   */
  async function initialize() {
    loading.value = true
    
    // 1. Verifica se é um fluxo de recuperação de senha
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
       // Se você usa modal, pode abrir aqui. 
       // Se migrou para Views, o próprio LoginView pode tratar isso.
       uiStore.openModal('auth') // Fallback para garantir
    }

    try {
      // 2. Pega a sessão atual
      const { data } = await supabaseClient.auth.getSession()
      
      if (data.session?.user) {
        user.value = data.session.user
        // Busca role sem await para não travar a UI inicial
        fetchUserRole(user.value.id)
        startInactivityTimer()
      } else {
        user.value = null
        userRole.value = 'user'
      }
    } catch (error) {
      console.error('Erro na inicialização do Auth:', error)
    } finally {
      loading.value = false // Libera o app para renderizar
    }

    // 3. Configura o listener para mudanças futuras de estado
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
         // Lógica de recuperação
      } else if (event === 'SIGNED_IN' && session?.user) {
        user.value = session.user
        await fetchUserRole(session.user.id)
        startInactivityTimer()
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        userRole.value = 'user'
        clearTimeout(sessionTimer.value)
      }
    })
  }

  /**
   * Realiza o Login com Email e Senha
   */
  async function handleLogin(email: string, pass: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass,
      })

      if (error) throw error
      
      if (data.user) {
        user.value = data.user
        await fetchUserRole(data.user.id)
        startInactivityTimer()
        return true
      }
      return false
    } catch (e: any) {
      console.error('Login error:', e.message)
      return false
    }
  }

  /**
   * Realiza o Logout seguro
   */
  async function signOut() {
    try {
      await supabaseClient.auth.signOut()
    } catch (error) {
      console.error('Erro ao sair do Supabase:', error)
    } finally {
      // Limpeza agressiva de estado
      user.value = null
      userRole.value = 'user'
      clearTimeout(sessionTimer.value)
      
      // Redireciona para login recarregando a página para limpar memória
      window.location.href = '/' 
    }
  }

  /**
   * Envia e-mail de recuperação de senha
   */
  async function handleForgotPassword(email: string) {
    const redirectTo = window.location.origin
    return await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })
  }
  
  /**
   * Completa o fluxo de recuperação de senha (após clicar no link do email)
   */
  async function completePasswordRecovery() {
    window.history.replaceState({}, document.title, window.location.pathname)
    const { data } = await supabaseClient.auth.getSession()
    if (data.session?.user) {
        user.value = data.session.user
        await fetchUserRole(data.session.user.id)
        uiStore.closeModal() // Fecha modal se estiver aberto
        uiStore.showToast('Senha recuperada e logado com sucesso!', 'success')
        startInactivityTimer()
    }
  }

  return {
    // State & Getters
    user,
    userRole, 
    loading,
    isAuthReady,
    isAuthenticated,
    
    // Actions
    initialize,      // Renomeado de init -> initialize para bater com o Router
    handleLogin,
    signOut,         // Renomeado de handleLogout -> signOut (padrão mais comum)
    handleForgotPassword,
    completePasswordRecovery,
    resetTimer
  }
})