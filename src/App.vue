<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useUiStore } from './stores/uiStore'

// Modais Globais
import AuthModal from './components/AuthModal.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import AdminModal from './components/AdminModal.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

// --- LÓGICA DE RECONEXÃO MOBILE (FIX ZOMBIE APP) ---
const handleVisibilityChange = async () => {
  // Se a aba/app ficou visível novamente
  if (document.visibilityState === 'visible') {
    console.log('App voltou do background (resume). Verificando sessão...')
    
    // Se o usuário estiver "logado" na memória, verificamos se a sessão ainda é válida no servidor
    if (authStore.user) {
      // checkSession checa o token com o Supabase
      const result = await authStore.checkSession()
      
      if (!result?.valid) {
        uiStore.notify('Sessão expirada. Faça login novamente.', 'warning')
        authStore.signOut()
      }
    }
  }
}

onMounted(() => {
  // Garante que o estado dos modais comece limpo
  uiStore.closeAllModals()
  
  // Inicializa a autenticação
  authStore.initialize()

  // Adiciona o ouvinte para acordar o app quando voltar do background
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  // Remove o ouvinte para evitar vazamento de memória
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <router-view />

  <NotificationContainer />
  <AuthModal />
  <ConfirmModal />
  <AdminModal />
</template>