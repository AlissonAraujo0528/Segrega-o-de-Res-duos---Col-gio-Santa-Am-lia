<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUiStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'

// Componentes Globais
import NotificationContainer from './components/NotificationContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import AuthModal from './components/AuthModal.vue'
import AdminModal from './components/AdminModal.vue'
import ThemeToggle from './components/ThemeToggle.vue'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
  uiStore.applyTheme(savedTheme)
})

const isLoginPage = computed(() => route.path === '/' || route.name === 'login')

// Helper para destacar o menu ativo
const isActive = (path: string) => 
  route.path === path 
    ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-bold shadow-sm' 
    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'

function doLogout() {
  authStore.signOut()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col font-sans">

    <nav v-if="!isLoginPage && authStore.user" class="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm transition-all">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        
        <div class="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity group" @click="router.push('/evaluation')">
          <img src="/KLIN.png" alt="Logo" class="h-8 w-auto transition-transform group-hover:scale-105" /> 
          <span class="font-bold text-xl tracking-tight hidden sm:block text-teal-700 dark:text-teal-400">Gestão 5S</span>
        </div>

        <div class="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
          <button 
            @click="router.push('/evaluation')" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none flex items-center gap-2"
            :class="isActive('/evaluation')"
          >
            <i class="fa-solid fa-clipboard-check"></i> Avaliar
          </button>

          <button 
            @click="router.push('/dashboard')" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none flex items-center gap-2"
            :class="isActive('/dashboard')"
          >
            <i class="fa-solid fa-chart-pie"></i> Dashboard
          </button>
          
          <button 
            @click="router.push('/ranking')" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none flex items-center gap-2"
            :class="isActive('/ranking')"
          >
            <i class="fa-solid fa-list-ol"></i> Ranking
          </button>
        </div>

        <div class="flex items-center gap-2 sm:gap-4">
           
           <button 
              v-if="authStore.userRole === 'admin'" 
              @click="uiStore.openAdminModal"
              class="p-2 rounded-full text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              title="Administração"
            >
              <i class="fa-solid fa-cog text-xl"></i>
            </button>

           <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

           <ThemeToggle />
           
           <button @click="doLogout" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all" title="Sair">
             <i class="fa-solid fa-right-from-bracket text-xl"></i>
           </button>
        </div>
      </div>
      
      <div class="md:hidden mt-3 border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-around">
           <button @click="router.push('/evaluation')" :class="isActive('/evaluation')" class="p-2 rounded-lg flex flex-col items-center gap-1 text-xs">
             <i class="fa-solid fa-clipboard-check text-lg"></i> Avaliar
           </button>
           <button @click="router.push('/dashboard')" :class="isActive('/dashboard')" class="p-2 rounded-lg flex flex-col items-center gap-1 text-xs">
             <i class="fa-solid fa-chart-pie text-lg"></i> Dash
           </button>
           <button @click="router.push('/ranking')" :class="isActive('/ranking')" class="p-2 rounded-lg flex flex-col items-center gap-1 text-xs">
             <i class="fa-solid fa-list-ol text-lg"></i> Ranking
           </button>
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
  <AuthModal v-if="uiStore.modals.auth" />
  <AdminModal v-if="uiStore.modals.admin" /> 

</template>

<style>
/* Transição suave entre páginas */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>