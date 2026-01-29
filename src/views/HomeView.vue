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

const userInitial = computed(() => authStore.user?.email?.charAt(0).toUpperCase() || 'U')
const userName = computed(() => authStore.user?.email?.split('@')[0] || 'Usuário')
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans">
    
    <header class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between gap-4">
        
        <div class="flex items-center gap-3 min-w-0">
          <div class="bg-teal-50 dark:bg-teal-900/30 p-1.5 rounded-lg">
             <img src="../assets/KLIN.png" alt="Klin" class="h-6 sm:h-8 w-auto" />
          </div>
          <div class="hidden md:flex flex-col leading-tight">
            <h1 class="text-base font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">
              Klin Ambiental
            </h1>
            <span class="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em]">
              Coleta Seletiva
            </span>
          </div>
        </div>

        <nav class="flex-1 flex justify-center max-w-md">
          <div class="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-full shadow-inner w-full sm:w-auto overflow-x-auto">
            
            <button 
              v-for="tab in ['evaluation', 'ranking', 'dashboard']" 
              :key="tab"
              @click="uiStore.setActiveTab(tab as any)"
              class="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
              :class="uiStore.activeTab === tab 
                ? 'bg-teal-600 text-white shadow-md transform scale-105' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200'"
            >
              <i class="fa-solid text-sm" :class="{
                'evaluation': 'fa-clipboard-list',
                'ranking': 'fa-trophy',
                'dashboard': 'fa-chart-pie'
              }[tab]"></i>
              <span class="hidden sm:inline capitalize">{{ tab === 'evaluation' ? 'Avaliar' : tab === 'ranking' ? 'Ranking' : 'Dash' }}</span>
            </button>

          </div>
        </nav>

        <div class="flex items-center gap-3 min-w-0">
          
          <ThemeToggle />

          <button 
            v-if="authStore.userRole === 'admin'"
            @click="uiStore.openAdmin()"
            class="hidden sm:flex p-2.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-xl transition-all"
            title="Painel Administrativo"
          >
            <i class="fa-solid fa-gear text-lg"></i>
          </button>

          <div class="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

          <button 
            @click="authStore.signOut"
            class="flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs font-bold border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
            title="Sair do Sistema"
          >
            <div class="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <i class="fa-solid fa-right-from-bracket"></i>
            </div>
            <span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <Transition name="scale" mode="out-in">
        <KeepAlive include="EvaluationView">
          <component :is="uiStore.activeTab === 'evaluation' ? EvaluationView : uiStore.activeTab === 'ranking' ? RankingView : DashboardView" />
        </KeepAlive>
      </Transition>
    </main>

  </div>
</template>

<style scoped>
/* Animação mais suave de escala ao trocar de aba */
.scale-enter-active, .scale-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.scale-enter-from { opacity: 0; transform: scale(0.98); }
.scale-leave-to { opacity: 0; transform: scale(1.02); }
</style>