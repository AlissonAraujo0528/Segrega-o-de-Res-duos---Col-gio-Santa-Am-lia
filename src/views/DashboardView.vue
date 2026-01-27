<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useDashboardStore } from '../stores/dashboardStore'

// Componentes UI do Design System
import AppCard from '../components/ui/AppCard.vue'

// Chart.js imports
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Colors
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, ArcElement, Colors, ChartDataLabels)

const dashboardStore = useDashboardStore()

const selectedPeriod = ref('')
const activeTab = ref<'overview' | 'history'>('overview')

// Inicialização
onMounted(async () => {
  await dashboardStore.fetchAvailablePeriods()
  if (dashboardStore.availablePeriods.length > 0 && dashboardStore.availablePeriods[0]) {
    selectedPeriod.value = dashboardStore.availablePeriods[0].id
  }
})

// Reatividade
watch([selectedPeriod, activeTab], async ([newPeriod, newTab]) => {
  if (!newPeriod) return

  const parts = newPeriod.split('-')
  if (parts.length === 2) {
      const year = Number(parts[0])
      const month = Number(parts[1])
      
      if (!isNaN(year) && !isNaN(month)) {
          if (newTab === 'overview') {
              await dashboardStore.fetchDashboardData(month, year)
          } else {
              await dashboardStore.fetchRecentHistory(month, year)
          }
      }
  }
}, { immediate: true })

// Configurações Gráficas
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: '#6b7280',
        padding: 20,
        font: { family: 'sans-serif' }
      }
    },
    tooltip: {
      callbacks: {
        label: (context: any) => ` ${context.label}: ${context.raw}`
      }
    },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold' as const, size: 14 },
      formatter: (value: number) => value > 0 ? value : ''
    }
  }
}))

const chartData = computed(() => {
  const gold = dashboardStore.medalLists.gold.length
  const silver = dashboardStore.medalLists.silver.length
  const bronze = dashboardStore.medalLists.bronze.length
  
  if (gold + silver + bronze === 0) return null

  return {
    labels: ['Ouro 🥇', 'Prata 🥈', 'Bronze 🥉'],
    datasets: [
      {
        backgroundColor: ['#EAB308', '#9CA3AF', '#F97316'],
        borderWidth: 0,
        data: [gold, silver, bronze]
      }
    ]
  }
})

const scoreColor = computed(() => {
  const score = dashboardStore.kpis.average_score
  if (score >= 19) return 'text-green-600 dark:text-green-400'
  if (score >= 15) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
})

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
  })
}
</script>

<template>
  <div class="space-y-6">
    
    <AppCard class="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-teal-600"></i> Dashboard
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Indicadores de desempenho e evolução.
        </p>
      </div>

      <div class="w-full sm:w-auto">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Período</label>
        <div class="relative">
          <select 
            v-model="selectedPeriod"
            class="w-full sm:w-64 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 appearance-none cursor-pointer outline-none transition-all"
          >
            <option value="" disabled>Selecione...</option>
            <option v-for="p in dashboardStore.availablePeriods" :key="p.id" :value="p.id">
              {{ p.label }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <i class="fa-solid fa-chevron-down text-xs"></i>
          </div>
        </div>
      </div>
    </AppCard>

    <div class="flex border-b border-gray-200 dark:border-gray-700">
      <button 
        @click="activeTab = 'overview'"
        class="py-3 px-6 font-medium text-sm border-b-2 transition-colors focus:outline-none"
        :class="activeTab === 'overview' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
      >
        <i class="fa-solid fa-chart-pie mr-2"></i> Visão Geral
      </button>
      <button 
        @click="activeTab = 'history'"
        class="py-3 px-6 font-medium text-sm border-b-2 transition-colors focus:outline-none"
        :class="activeTab === 'history' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
      >
        <i class="fa-solid fa-list-check mr-2"></i> Histórico Detalhado
      </button>
    </div>

    <div v-if="dashboardStore.isLoading" class="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
      <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-3 text-teal-500"></i>
      <p>Processando dados...</p>
    </div>

    <div v-else-if="activeTab === 'overview'" class="space-y-6 animate-fade-in">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <AppCard class="p-6 flex flex-col items-center relative group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Média</span>
          <span class="text-5xl font-black tracking-tighter" :class="scoreColor">
            {{ dashboardStore.kpis.average_score }}
          </span>
          <span class="text-xs text-gray-400 mt-2 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Meta: 19.0</span>
        </AppCard>

        <AppCard class="p-6 flex flex-col items-center relative group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avaliações</span>
          <span class="text-5xl font-black text-gray-700 dark:text-gray-200 tracking-tighter">
            {{ dashboardStore.kpis.total_evaluations }}
          </span>
          <span class="text-xs text-gray-400 mt-2 font-medium">Registros este mês</span>
        </AppCard>

        <AppCard class="p-6 flex flex-col items-center relative text-center justify-center group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Melhor Setor</span>
          <span class="text-lg font-bold text-gray-800 dark:text-white leading-tight break-words w-full px-2">
            {{ dashboardStore.kpis.top_sector }}
          </span>
          <span v-if="dashboardStore.medalLists.gold.length > 0" class="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <i class="fa-solid fa-trophy mr-1"></i> Líder
          </span>
        </AppCard>

      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div class="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <AppCard class="flex flex-col h-96">
            <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 border-b border-yellow-100 dark:border-yellow-900/30 flex justify-between items-center">
              <h3 class="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2 text-sm">
                <i class="fa-solid fa-star"></i> Ouro
              </h3>
              <span class="text-xs font-bold bg-white dark:bg-gray-700 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-md shadow-sm">{{ dashboardStore.medalLists.gold.length }}</span>
            </div>
            <div class="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin">
              <div v-for="s in dashboardStore.medalLists.gold" :key="s.sector_id" class="flex justify-between items-center p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ s.sector_name }}</span>
                <span class="text-sm font-bold text-yellow-600 dark:text-yellow-400">{{ s.average }}</span>
              </div>
              <div v-if="dashboardStore.medalLists.gold.length === 0" class="text-center p-4 text-gray-400 text-sm italic">Vazio.</div>
            </div>
          </AppCard>

          <AppCard class="flex flex-col h-96">
            <div class="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <h3 class="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm">
                <i class="fa-solid fa-medal"></i> Prata
              </h3>
              <span class="text-xs font-bold bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-200 px-2 py-1 rounded-md shadow-sm">{{ dashboardStore.medalLists.silver.length }}</span>
            </div>
            <div class="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin">
              <div v-for="s in dashboardStore.medalLists.silver" :key="s.sector_id" class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ s.sector_name }}</span>
                <span class="text-sm font-bold text-gray-500 dark:text-gray-400">{{ s.average }}</span>
              </div>
              <div v-if="dashboardStore.medalLists.silver.length === 0" class="text-center p-4 text-gray-400 text-sm italic">Vazio.</div>
            </div>
          </AppCard>

          <AppCard class="flex flex-col h-96">
            <div class="bg-orange-50 dark:bg-orange-900/20 p-3 border-b border-orange-100 dark:border-orange-900/30 flex justify-between items-center">
              <h3 class="font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2 text-sm">
                <i class="fa-solid fa-triangle-exclamation"></i> Atenção
              </h3>
              <span class="text-xs font-bold bg-white dark:bg-gray-700 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-md shadow-sm">{{ dashboardStore.medalLists.bronze.length }}</span>
            </div>
            <div class="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin">
              <div v-for="s in dashboardStore.medalLists.bronze" :key="s.sector_id" class="flex justify-between items-center p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ s.sector_name }}</span>
                <span class="text-sm font-bold text-orange-600 dark:text-orange-400">{{ s.average }}</span>
              </div>
              <div v-if="dashboardStore.medalLists.bronze.length === 0" class="text-center p-4 text-gray-400 text-sm italic">Vazio.</div>
            </div>
          </AppCard>

        </div>

        <AppCard class="p-4 flex flex-col h-96">
          <h3 class="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Distribuição</h3>
          <div class="flex-1 relative">
            <Pie v-if="chartData" :data="chartData" :options="chartOptions" />
            <div v-else class="flex h-full items-center justify-center text-gray-400 text-sm">Sem dados.</div>
          </div>
        </AppCard>

      </div>
    </div>

    <div v-else class="space-y-4 animate-fade-in">
      
      <div v-if="dashboardStore.recentEvaluations.length === 0" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 text-gray-400">
          <i class="fa-regular fa-folder-open text-3xl"></i>
        </div>
        <p class="text-gray-500 dark:text-gray-400">Nenhum registro encontrado.</p>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <AppCard v-for="item in dashboardStore.recentEvaluations" :key="item.id" class="p-5 group">
          
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
            <div>
              <h4 class="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                {{ item.setor_nome || 'Setor Desconhecido' }}
                <span v-if="item.nota === 20" class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">Perfeito</span>
              </h4>
              <div class="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span class="flex items-center gap-1"><i class="fa-regular fa-calendar"></i> {{ formatDate(item.created_at) }}</span>
                <span class="flex items-center gap-1"><i class="fa-regular fa-user"></i> {{ item.responsible_name || 'Resp. não informado' }}</span>
              </div>
            </div>

            <div class="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-0 ml-auto sm:ml-0">
              <span class="text-3xl font-black leading-none" 
                :class="item.nota >= 19 ? 'text-green-600 dark:text-green-400' : item.nota >= 15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'">
                {{ item.nota }}
              </span>
              <span class="text-[10px] uppercase font-bold text-gray-400">Pontos</span>
            </div>
          </div>

          <div v-if="item.issues && item.issues.length > 0" class="mt-3 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
            <p class="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-2 flex items-center gap-2">
              <i class="fa-solid fa-circle-exclamation"></i> Pontos de Atenção:
            </p>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <li v-for="issue in item.issues" :key="issue" class="text-sm text-red-800 dark:text-red-300 flex items-start gap-2">
                <span class="text-red-400 mt-1">•</span> {{ issue }}
              </li>
            </ul>
          </div>

          <div v-if="item.cleanObservation" class="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg italic border border-gray-100 dark:border-gray-700">
            "{{ item.cleanObservation }}"
          </div>

          <div v-if="item.foto_url" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
             <a :href="item.foto_url" target="_blank" class="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline flex items-center gap-1 transition-colors">
               <i class="fa-solid fa-image"></i> Ver Evidência Fotográfica
             </a>
          </div>

        </AppCard>
      </div>
    </div>

  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
.dark .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #4b5563; }

.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>