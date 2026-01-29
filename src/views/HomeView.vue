<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

// Importamos as Views antigas como componentes
import EvaluationView from './EvaluationView.vue'
import RankingView from './RankingView.vue'
import DashboardView from './DashboardView.vue'

// Componentes UI
import ThemeToggle from '../components/ThemeToggle.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

// Controle de qual "Aba" está visível. Padrão: 'evaluation'
const activeTab = ref<'evaluation' | 'ranking' | 'dashboard'>('evaluation')

// Iniciais do usuário para o avatar
const userInitial = computed(() => {
  return authStore.user?.email?.charAt(0).toUpperCase() || 'U'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        <div class="flex items-center gap-3">
          <img src="../assets/KLIN.png" alt="Klin" class="h-8 w-auto opacity-90" />
          <div class="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          <h1 class="hidden md:block text-lg font-bold text-gray-700 dark:text-gray-200 tracking-tight">
            Programa 5S
          </h1>
        </div>

        <nav class="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button 
            @click="activeTab = 'evaluation'"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="activeTab === 'evaluation' 
              ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
          >
            <i class="fa-solid fa-clipboard-check"></i>
            <span class="hidden sm:inline">Avaliar</span>
          </button>
          
          <button 
            @click="activeTab = 'ranking'"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="activeTab === 'ranking' 
              ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
          >
            <i class="fa-solid fa-trophy"></i>
            <span class="hidden sm:inline">Ranking</span>
          </button>
          
          <button 
            @click="activeTab = 'dashboard'"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="activeTab === 'dashboard' 
              ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
          >
            <i class="fa-solid fa-chart-pie"></i>
            <span class="hidden sm:inline">Dash</span>
          </button>
        </nav>

        <div class="flex items-center gap-2">
          
          <ThemeToggle />

          <button 
            v-if="authStore.userRole === 'admin'"
            @click="uiStore.openAdmin()"
            class="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-gray-700 rounded-lg transition-all relative group"
            title="Administração"
          >
            <i class="fa-solid fa-gear text-lg"></i>
          </button>

          <button 
            @click="authStore.signOut"
            class="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm hover:bg-red-100 hover:text-red-600 transition-colors ml-2"
            title="Sair do Sistema"
          >
            {{ userInitial }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto p-4 sm:p-6">
      <Transition name="fade" mode="out-in">
        
        <KeepAlive include="EvaluationView">
          <component :is="activeTab === 'evaluation' ? EvaluationView : activeTab === 'ranking' ? RankingView : DashboardView" />
        </KeepAlive>
      
      </Transition>
    </main>

  </div>
</template>

<style scoped>
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