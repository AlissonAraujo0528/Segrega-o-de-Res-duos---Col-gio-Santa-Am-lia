<script setup lang="ts">
import { onMounted } from 'vue' 
import AuthModal from './components/AuthModal.vue'
import EvaluationForm from './components/EvaluationForm.vue'
import RankingModal from './components/RankingModal.vue'
import DashboardModal from './components/DashboardModal.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import AdminModal from './components/AdminModal.vue'
import { useAuthStore } from './stores/authStore'
import { useUiStore, type ThemeName } from './stores/uiStore'

const authStore = useAuthStore()
const uiStore = useUiStore()

onMounted(() => {
  const savedTheme = (localStorage.getItem('theme') as ThemeName | null) || 'system'
  uiStore.applyTheme(savedTheme)
})
</script>

<template>
  <div class="w-full min-h-screen bg-bg-primary text-text-primary dark:bg-bg-primary-dark">
    
    <AuthModal v-if="!authStore.userRole" />

    <EvaluationForm v-else />
    
    <RankingModal v-if="uiStore.activeModal === 'ranking'" /> 
    <DashboardModal v-if="uiStore.activeModal === 'dashboard'" /> 
    
    <AdminModal v-if="uiStore.activeModal === 'admin' && authStore.userRole === 'admin'" />

  </div>

  <NotificationContainer />
  <ConfirmModal />
</template>