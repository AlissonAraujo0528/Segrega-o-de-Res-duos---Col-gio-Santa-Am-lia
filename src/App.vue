<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUiStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'

// Componentes Globais
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import AuthModal from './components/AuthModal.vue'
import AdminModal from './components/AdminModal.vue' // Garanta que este arquivo existe
import ThemeToggle from './components/ThemeToggle.vue'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Inicializa tema
onMounted(() => {
  uiStore.initTheme()
})

const isLoginPage = computed(() => route.path === '/' || route.name === 'login')

// Helper para classes de link ativo
const activeClass = 'text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/20'
const inactiveClass = 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'

const getLinkClass = (path: string) => 
  route.path.startsWith(path) ? activeClass : inactiveClass

async function doLogout() {
  await authStore.signOut()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans flex flex-col">
    
    <header 
      v-if="!isLoginPage && authStore.user" 
      class="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div class="flex items-center gap-3 cursor-pointer group" @click="router.push('/evaluation')">
          <img src="/KLIN.png" alt="Logo Klin" class="h-8 w-auto transition-transform duration-300 group-hover:scale-105" />
          <div class="flex flex-col">
            <span class="font-bold text-lg leading-tight text-teal-700 dark:text-teal-400 tracking-tight">Gestão 5S</span>
            <span class="text-[0.65rem] text-gray-500 uppercase tracking-widest hidden sm:block">Braskem CASE</span>
          </div>
        </div>

        <nav class="hidden md:flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl">
          <button @click="router.push('/evaluation')" :class="[getLinkClass('/evaluation'), 'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2']">
            <i class="fa-solid fa-clipboard-check"></i> Avaliar
          </button>
          <button @click="router.push('/dashboard')" :class="[getLinkClass('/dashboard'), 'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2']">
            <i class="fa-solid fa-chart-pie"></i> Dashboard
          </button>
          <button @click="router.push('/ranking')" :class="[getLinkClass('/ranking'), 'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2']">
            <i class="fa-solid fa-list-ol"></i> Ranking
          </button>
        </nav>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          
          <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

          <button 
            v-if="authStore.userRole === 'admin'"
            @click="uiStore.openAdmin"
            class="p-2 rounded-full text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
            title="Área Administrativa"
          >
            <i class="fa-solid fa-cog text-lg"></i>
          </button>

          <button 
            @click="doLogout" 
            class="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Sair do Sistema"
          >
            <i class="fa-solid fa-right-from-bracket text-lg"></i>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav 
      v-if="!isLoginPage && authStore.user"
      class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe"
    >
      <div class="flex justify-around items-center h-16">
        <button 
          @click="router.push('/evaluation')" 
          class="flex flex-col items-center justify-center w-full h-full gap-1"
          :class="route.path.startsWith('/evaluation') ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'"
        >
          <i class="fa-solid fa-clipboard-check text-xl mb-0.5"></i>
          <span class="text-[10px] font-medium">Avaliar</span>
        </button>

        <button 
          @click="router.push('/dashboard')" 
          class="flex flex-col items-center justify-center w-full h-full gap-1"
          :class="route.path.startsWith('/dashboard') ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'"
        >
          <i class="fa-solid fa-chart-pie text-xl mb-0.5"></i>
          <span class="text-[10px] font-medium">Dash</span>
        </button>

        <button 
          @click="router.push('/ranking')" 
          class="flex flex-col items-center justify-center w-full h-full gap-1"
          :class="route.path.startsWith('/ranking') ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'"
        >
          <i class="fa-solid fa-list-ol text-xl mb-0.5"></i>
          <span class="text-[10px] font-medium">Ranking</span>
        </button>
      </div>
    </nav>

    <footer v-if="!isLoginPage" class="hidden md:block py-6 text-center text-xs text-gray-400 dark:text-gray-600">
      &copy; {{ new Date().getFullYear() }} Braskem - Gestão de Resíduos (CASE)
    </footer>

    <NotificationContainer />
    <ConfirmModal />
    
    <AuthModal v-if="uiStore.modals.auth" />
    <AdminModal v-if="uiStore.modals.admin" />

  </div>
</template>

<style>
/* Utility class for safe area spacing on iPhone X+ */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}

/* Page Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>