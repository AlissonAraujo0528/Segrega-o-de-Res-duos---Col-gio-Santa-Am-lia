import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

export const useAuthStore = defineStore('auth', () => {
  const userRole = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const isAuthReady = ref(false)
  const inactivityTimer = ref<number | undefined>(undefined)
  
  // Flag para evitar conflito entre login manual e listener
  let isProcessingLogin = false

  // --- FUNÇÕES DE INATIVIDADE ---
  async function logoutDueToInactivity() {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore() 
    uiStore.showToast('Você foi desconectado por inatividade.', 'info')
    handleLogout()
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    inactivityTimer.value = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS) as unknown as number
  }

  function startInactivityTimer() {
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer)
    })
    resetInactivityTimer()
  }

  function stopInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.removeEventListener(event, resetInactivityTimer)
    })
  }

  // --- ACTIONS ---

  async function checkUserProfileAndInitialize(user: User) {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    // 1. Se tiver hash de recuperação, prioridade total para o fluxo de senha
    const isRecoveryUrl = window.location.hash && window.location.hash.includes('type=recovery')
    
    if (isRecoveryUrl) {
        console.log("🔗 Link de recuperação detectado. Abrindo modal.")
        uiStore.authModalMode = 'update_password'
        uiStore.isRecoveryMode = true
        currentUserId.value = user.id
        // NÃO setamos userRole, mantendo a Dashboard fechada
        isAuthReady.value = true
        return
    }

    try {
      console.log("🔍 Verificando perfil...")
      
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      if (profile.must_change_password) {
        console.log("⚠️ Flag de troca de senha ativa.")
        uiStore.authModalMode = 'update_password'
        uiStore.isRecoveryMode = true
        currentUserId.value = user.id
        // Mantém userRole null
      } else {
        console.log("✅ Acesso permitido. Carregando Role...")
        const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
        if (roleError) throw roleError
        
        // Libera o sistema
        uiStore.isRecoveryMode = false
        uiStore.authModalMode = 'login'
        userRole.value = role
        currentUserId.value = user.id
        
        startInactivityTimer()
      }
    } catch (error) {
      console.error("Erro na verificação:", error)
      await handleLogout()
    } finally {
      isAuthReady.value = true
    }
  }

  // --- NOVA FUNÇÃO MÁGICA: TRANSIÇÃO SEM RELOAD ---
  async function completePasswordRecovery() {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    console.log("🔄 Finalizando recuperação de senha...")

    try {
        // 1. Limpa a URL para remover o token sem recarregar a página
        window.history.replaceState(null, '', window.location.pathname)

        // 2. Obtém o usuário atual (já logado com a nova senha)
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error("Usuário perdido após update.")

        // 3. Busca a Role para liberar o acesso
        const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
        if (roleError) throw roleError

        // 4. Atualiza estado e libera Dashboard
        uiStore.isRecoveryMode = false
        uiStore.authModalMode = 'login'
        
        userRole.value = role
        currentUserId.value = user.id
        
        startInactivityTimer()
        console.log("🎉 Recuperação concluída. Dashboard aberta.")

    } catch (e) {
        console.error("Erro ao finalizar recuperação:", e)
        // Se der erro aqui, aí sim forçamos um logout/reload como fallback
        await handleLogout()
        window.location.reload()
    }
  }

  async function handleLogout() {
    stopInactivityTimer()
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    uiStore.isRecoveryMode = false
    uiStore.authModalMode = 'login'

    await supabaseClient.auth.signOut()
    
    userRole.value = null
    currentUserId.value = null
  }

  async function handleLogin(email: string, password: string) {
    isProcessingLogin = true
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        if (data.user) {
            await checkUserProfileAndInitialize(data.user)
        }
    } finally {
        isProcessingLogin = false
    }
  }
  
  async function handleForgotPassword(email: string) {
    let baseUrl = (window.location.origin + window.location.pathname)
      .replace(/\/index\.html$/, '') 
      .replace(/\/+$/, '');
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: baseUrl });
    if (error) throw error;
  }

  // --- LISTENER ---
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    // Se for um evento de recuperação, UI Store assume
    if (event === 'PASSWORD_RECOVERY') {
       console.log("⚡ Evento PASSWORD_RECOVERY")
       const { useUiStore } = await import('./uiStore')
       const uiStore = useUiStore()
       uiStore.isRecoveryMode = true
       uiStore.authModalMode = 'update_password'
       return
    }

    // Se estivermos fazendo login manual, ignora para evitar duplicidade
    if (isProcessingLogin) return

    if (event === 'SIGNED_IN' && session?.user && !userRole.value) {
       await checkUserProfileAndInitialize(session.user)
    } 
    else if (event === 'SIGNED_OUT') {
      stopInactivityTimer()
      userRole.value = null
      currentUserId.value = null
      isAuthReady.value = true
    }
  });

  return {
    userRole,
    currentUserId,
    isAuthReady,
    handleLogin,
    handleLogout,
    handleForgotPassword,
    completePasswordRecovery, // Exportando a nova função
    checkUserProfileAndInitialize
  }
})