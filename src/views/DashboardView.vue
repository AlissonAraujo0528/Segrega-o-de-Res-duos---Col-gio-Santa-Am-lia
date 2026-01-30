<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useDashboardStore } from '../stores/dashboardStore'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'

const store = useDashboardStore()

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const selectedMonthName = computed(() => monthNames[store.currentMonth - 1])

onMounted(() => {
  store.fetchDashboardData()
})

// Navegação de mês
function changeMonth(delta: number) {
  let newMonth = store.currentMonth + delta
  let newYear = store.currentYear
  
  if (newMonth > 12) { newMonth = 1; newYear++ }
  if (newMonth < 1) { newMonth = 12; newYear-- }
  
  store.setFilter(newMonth, newYear)
}

// Configuração visual das medalhas
const medalConfig = {
  gold: { 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-100 dark:bg-yellow-900/20', 
    border: 'border-yellow-200 dark:border-yellow-900/50', 
    icon: 'fa-medal',
    label: 'Ouro (40 pts)' 
  },
  silver: { 
    color: 'text-slate-500 dark:text-slate-400', 
    bg: 'bg-slate-100 dark:bg-slate-800', 
    border: 'border-slate-200 dark:border-slate-700', 
    icon: 'fa-medal',
    label: 'Prata (35-39 pts)' 
  },
  bronze: { 
    color: 'text-orange-700 dark:text-orange-500', 
    bg: 'bg-orange-50 dark:bg-orange-900/20', 
    border: 'border-orange-200 dark:border-orange-900/50', 
    icon: 'fa-circle-exclamation', // Ícone de alerta para bronze
    label: 'Bronze (< 34 pts)' 
  }
}
</script>

<template>
  <div class="space-y-6 pb-24 animate-fade-in">
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-[70px] z-20">
      
      <div class="flex items-center gap-3 w-full md:w-auto">
        <button @click="changeMonth(-1)" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        
        <div class="text-center flex-1 md:flex-none">
          <h2 class="text-lg font-bold text-gray-800 dark:text-white leading-tight">
            {{ selectedMonthName }} <span class="text-teal-600 dark:text-teal-400">{{ store.currentYear }}</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">Visão Mensal Consolidada</p>
        </div>

        <button @click="changeMonth(1)" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <AppButton 
        size="sm" 
        variant="secondary" 
        @click="store.refresh" 
        :loading="store.loading"
        class="hidden md:flex"
      >
        <i class="fa-solid fa-rotate-right mr-2"></i> Atualizar
      </AppButton>
    </div>

    <div v-if="store.loading" class="py-20 text-center text-teal-600">
      <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-4"></i>
      <p class="font-medium animate-pulse">Calculando resultados...</p>
    </div>

    <div v-else-if="store.data" class="space-y-8">

      <section>
        <h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-1">
          Quadro de Medalhas
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="(sectors, type) in store.data.medals" :key="type" 
               class="relative overflow-hidden rounded-2xl border-2 p-5 flex flex-col items-center text-center transition-transform hover:scale-[1.02] shadow-sm"
               :class="[medalConfig[type].bg, medalConfig[type].border]">
            
            <div class="w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-2xl shadow-sm mb-3"
                 :class="medalConfig[type].color">
              <i class="fa-solid" :class="medalConfig[type].icon"></i>
            </div>
            
            <h4 class="text-3xl font-black text-gray-800 dark:text-white mb-1">
              {{ sectors.length }}
            </h4>
            <span class="text-xs font-bold uppercase tracking-wider opacity-70 mb-4 block">
              {{ medalConfig[type].label }}
            </span>
            
            <div class="w-full border-t border-black/5 dark:border-white/10 pt-3 mt-auto">
               <p v-if="sectors.length === 0" class="text-xs opacity-50 italic">Nenhuma sala nesta categoria.</p>
               <div v-else class="max-h-24 overflow-y-auto text-xs font-medium text-gray-700 dark:text-gray-300 space-y-1 px-2 custom-scrollbar">
                 <div v-for="sector in sectors" :key="sector" class="truncate">
                   {{ sector }}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <AppCard class="flex flex-col h-full border-t-4 border-t-green-500">
            <div class="mb-4 flex justify-between items-center">
              <h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <i class="fa-solid fa-arrow-trend-up text-green-500"></i> Destaques (Melhoraram)
              </h3>
              <span class="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">
                {{ store.data.improved.length }}
              </span>
            </div>
            
            <div class="flex-1 min-h-[150px]">
              <p v-if="store.data.improved.length === 0" class="text-sm text-gray-400 text-center py-10 italic">
                Nenhuma evolução registrada neste mês.
              </p>
              <ul v-else class="space-y-2">
                <li v-for="item in store.data.improved" :key="item.name" 
                    class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <span class="font-semibold text-sm text-gray-700 dark:text-gray-200">{{ item.name }}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400">{{ item.old }} <i class="fa-solid fa-arrow-right text-[10px]"></i> {{ item.new }}</span>
                    <span class="text-xs font-bold text-green-600 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm">
                      +{{ item.diff }}
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </AppCard>

          <AppCard class="flex flex-col h-full border-t-4 border-t-red-500">
            <div class="mb-4 flex justify-between items-center">
              <h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation text-red-500"></i> Atenção (Caíram)
              </h3>
              <span class="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">
                {{ store.data.worsened.length }}
              </span>
            </div>
            
            <div class="flex-1 min-h-[150px]">
              <p v-if="store.data.worsened.length === 0" class="text-sm text-gray-400 text-center py-10 italic">
                Excelente! Nenhuma sala piorou a nota.
              </p>
              <ul v-else class="space-y-2">
                <li v-for="item in store.data.worsened" :key="item.name" 
                    class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <span class="font-semibold text-sm text-gray-700 dark:text-gray-200">{{ item.name }}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400">{{ item.old }} <i class="fa-solid fa-arrow-right text-[10px]"></i> {{ item.new }}</span>
                    <span class="text-xs font-bold text-red-600 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm">
                      {{ item.diff }}
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </AppCard>

        </div>
      </section>

      <section>
        <h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-1">
          Evolução Trimestral (Média Geral)
        </h3>
        <AppCard class="p-6">
          <div class="h-48 flex items-end justify-around gap-2 sm:gap-8 px-2 sm:px-10">
            
            <div v-if="store.data.quarterly.length === 0" class="w-full text-center text-gray-400 self-center">
              Sem dados históricos suficientes.
            </div>

            <div v-for="(item, index) in store.data.quarterly" :key="item.label" class="flex flex-col items-center gap-2 w-full group relative">
              
              <span class="text-lg sm:text-2xl font-black text-teal-600 dark:text-teal-400 transition-transform group-hover:-translate-y-1">
                {{ item.value }}
              </span>
              
              <div class="w-full max-w-[80px] bg-gray-100 dark:bg-gray-700 rounded-t-xl relative overflow-hidden h-full shadow-inner">
                 <div class="absolute bottom-0 w-full bg-gradient-to-t from-teal-600 to-teal-400 dark:from-teal-700 dark:to-teal-500 hover:brightness-110 transition-all duration-700 ease-out h-0 animate-grow rounded-t-md"
                      :style="{ height: (item.value * 2.5) + '%' }">
                 </div>
              </div>
              
              <span class="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 py-1 px-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                {{ item.label }}
              </span>

              <div v-if="index < store.data.quarterly.length - 1" class="hidden sm:block absolute top-1/2 -right-1/2 w-full h-[2px] border-t-2 border-dashed border-gray-200 dark:border-gray-700 -z-10"></div>
            </div>

          </div>
        </AppCard>
      </section>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.animate-grow { animation: growUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes growUp { from { height: 0; } }

/* Scrollbar fina para listas longas */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
</style>