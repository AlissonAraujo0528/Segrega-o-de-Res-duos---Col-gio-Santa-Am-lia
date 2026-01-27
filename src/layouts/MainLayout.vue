<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import ThemeToggle from '../components/ThemeToggle.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors flex flex-col">
    
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-3 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        
        <router-link to="/" class="flex items-center gap-3 group">
             <img src="../assets/KLIN.png" alt="Klin Logo" class="h-8 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
             <div class="hidden sm:block leading-tight">
                <h1 class="text-base font-bold text-gray-800 dark:text-white">Programa 5S</h1>
                <p class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Gestão de Qualidade</p>
             </div>
        </router-link>

        <div class="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <router-link 
            to="/dashboard" 
            active-class="bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm"
            class="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            Dashboard
          </router-link>
          
          <router-link 
            to="/ranking" 
            active-class="bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm"
            class="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            Ranking
          </router-link>
        </div>

        <div class="flex items-center gap-3">
           
           <button 
             @click="uiStore.openEvaluationModal"
             class="hidden sm:flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm active:transform active:scale-95"
           >
             <i class="fa-solid fa-plus"></i>
             <span>Avaliar</span>
           </button>

           <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

           <button 
             v-if="authStore.userRole === 'admin'"
             @click="uiStore.openAdminModal"
             class="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-gray-700 rounded-lg transition-all relative group"
             title="Painel Administrativo"
           >
             <i class="fa-solid fa-user-shield text-lg"></i>
             <span class="absolute top-full right-0 mt-1 w-max bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Admin</span>
           </button>

           <ThemeToggle />

           <button 
             @click="authStore.signOut"
             class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
             title="Sair do Sistema"
           >
             <i class="fa-solid fa-arrow-right-from-bracket text-lg"></i>
           </button>
        </div>
      </div>
      
      <div class="md:hidden mt-3 flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          <router-link 
            to="/dashboard" 
            active-class="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200"
            class="flex-1 text-center py-2 rounded-lg text-sm font-medium text-gray-600 border border-transparent"
          >
            Dashboard
          </router-link>
          <router-link 
            to="/ranking" 
            active-class="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200"
            class="flex-1 text-center py-2 rounded-lg text-sm font-medium text-gray-600 border border-transparent"
          >
            Ranking
          </router-link>
          <button 
             @click="uiStore.openEvaluationModal"
             class="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium"
           >
             + Avaliar
           </button>
      </div>
    </nav>

    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 fade-container">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 mt-auto">
      <div class="max-w-7xl mx-auto px-6 text-center text-xs text-gray-400">
        &copy; {{ new Date().getFullYear() }} Programa 5S - Gestão de Qualidade Klin.
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* Animação suave entre as trocas de página */
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