<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUiStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'

// Componentes Globais (Sobreposição/Overlay)
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import EvaluationForm from './components/EvaluationForm.vue'
import AuthModal from './components/AuthModal.vue'
import AdminModal from './components/AdminModal.vue'
import ThemeToggle from './components/ThemeToggle.vue'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  // Inicialização do Tema
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
  uiStore.applyTheme(savedTheme)
})

// Verifica se está na página de login para esconder a Navbar
const isLoginPage = computed(() => route.path === '/' || route.name === 'login')

function doLogout() {
  authStore.signOut()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">

    <nav v-if="!isLoginPage && authStore.user" class="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        
        <div class="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" @click="router.push('/dashboard')">
          <img src="/KLIN.png" alt="Logo" class="h-8 w-auto" /> 
          <span class="font-bold text-xl tracking-tight hidden sm:block text-teal-700 dark:text-teal-400">Gestão 5S</span>
        </div>

        <div class="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
          <button 
            @click="router.push('/dashboard')" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none"
            :class="route.path === '/dashboard' ? 'bg-white dark:bg-gray-600 shadow-sm text-teal-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            Dashboard
          </button>
          <button 
            @click="router.push('/ranking')" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none"
            :class="route.path === '/ranking' ? 'bg-white dark:bg-gray-600 shadow-sm text-teal-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            Ranking
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button 
            @click="uiStore.openEvaluationModal()"
            class="hidden sm:flex bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-teal-500/30 transition-all items-center gap-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <i class="fa-solid fa-plus"></i> <span class="hidden lg:inline">Avaliar</span>
          </button>

          <ThemeToggle />
          
          <button @click="doLogout" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sair">
            <i class="fa-solid fa-right-from-bracket text-lg"></i>
          </button>
        </div>
      </div>
    </nav>

    <main class="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer v-if="!isLoginPage" class="py-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 mt-auto">
      &copy; 2026 Braskem - Gestão de Resíduos (CASE)
    </footer>

  </div>

  <NotificationContainer />
  <ConfirmModal />
  <EvaluationForm v-if="uiStore.modals.evaluation" />
  <AuthModal v-if="uiStore.modals.auth" />
  <AdminModal v-if="uiStore.modals.admin" /> 

</template>

<style>
/* Transição suave entre páginas */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>