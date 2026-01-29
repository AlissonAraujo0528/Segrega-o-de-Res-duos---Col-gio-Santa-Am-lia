<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useUiStore } from './stores/uiStore' // Importe a store aqui

// Modais Globais
import AuthModal from './components/AuthModal.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import AdminModal from './components/AdminModal.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

onMounted(() => {
  // Garante que o estado comece limpo
  uiStore.closeAllModals()
  authStore.initialize()
})
</script>

<template>
  <router-view />

  <NotificationContainer />
  <AuthModal />
  <ConfirmModal />
  <AdminModal />
</template>