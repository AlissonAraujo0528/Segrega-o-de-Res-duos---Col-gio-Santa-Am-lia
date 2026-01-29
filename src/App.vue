<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'

// Modais Globais
import AuthModal from './components/AuthModal.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import AdminModal from './components/AdminModal.vue'

const authStore = useAuthStore()

onMounted(() => {
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