<script setup lang="ts">
import { onMounted } from 'vue'
import { useUiStore } from './stores/uiStore'

// Componentes Globais (Sobreposição/Overlay)
// Estes componentes podem aparecer em cima de QUALQUER rota (Login, Dashboard, etc)
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import EvaluationForm from './components/EvaluationForm.vue'
import AuthModal from './components/AuthModal.vue' 

const uiStore = useUiStore()

onMounted(() => {
  // Inicialização do Tema (Dark/Light Mode)
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
  uiStore.applyTheme(savedTheme)
})
</script>

<template>
  <router-view />

  <NotificationContainer />

  <ConfirmModal />
  
  <EvaluationForm v-if="uiStore.modals.evaluation" />
  
  <AuthModal v-if="uiStore.modals.auth" />

</template>