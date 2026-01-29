<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

import EvaluationView from './EvaluationView.vue'
import RankingView from './RankingView.vue'
import DashboardView from './DashboardView.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

const userInitial = computed(() => {
  return authStore.user?.email?.charAt(0).toUpperCase() || 'U'
})
</script>

<template>
  <div class="min-h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        <div class="flex items-center gap-3">
          <img src="../assets/KLIN.png" alt="Klin" class="h-8 w-auto opacity-90" />
          <div class="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          <div class="hidden md:flex flex-col leading-tight">
            <h1 class="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">
              Klin Ambiental
            </h1>
            <span class="text-[10px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              Coleta Seletiva
            </span>
          </div>
        </div>

        <nav class="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button 
            @click="uiStore.setActiveTab('evaluation')"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="uiStore.activeTab === 'evaluation' 
              ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
          >
            <i class="fa-solid fa-clipboard-check"></i>
            <span class="hidden sm:inline">Avaliar</span>
          </button>
          
          <button 
            @click="uiStore.setActiveTab('ranking')"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="uiStore.activeTab === 'ranking' 
              ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
          >
            <i class="fa-solid fa-list-check"></i>
            <span class="hidden sm:inline">Histórico</span>
          </button>
          
          <button 
            @click="uiStore.setActiveTab('dashboard')"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="uiStore.activeTab === 'dashboard' 
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
            class="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <i class="fa-solid fa-gear text-lg"></i>
          </button>
          <button 
            @click="authStore.signOut"
            class="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm hover:bg-red-100 hover:text-red-600 transition-colors ml-2"
          >
            {{ userInitial }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto p-4 sm:p-6">
      <Transition name="fade" mode="out-in">
        <KeepAlive include="EvaluationView">
          <component :is="uiStore.activeTab === 'evaluation' ? EvaluationView : uiStore.activeTab === 'ranking' ? RankingView : DashboardView" />
        </KeepAlive>
      </Transition>
    </main>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from { opacity: 0; transform: translateY(5px); }
.fade-leave-to { opacity: 0; transform: translateY(-5px); }
</style>