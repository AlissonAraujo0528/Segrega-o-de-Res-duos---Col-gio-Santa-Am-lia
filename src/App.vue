<script setup lang="ts">
import { onMounted } from 'vue'
import { useUiStore } from './stores/uiStore'

// Componentes Globais (Sobreposição/Overlay)
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import EvaluationForm from './components/EvaluationForm.vue'
import AuthModal from './components/AuthModal.vue' 
import AdminModal from './components/AdminModal.vue'

const uiStore = useUiStore()

onMounted(() => {
  // Inicialização do Tema
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
  
  <AdminModal v-if="uiStore.modals.admin" /> 

</template>