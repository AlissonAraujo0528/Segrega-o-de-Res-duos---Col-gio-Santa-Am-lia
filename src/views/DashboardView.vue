<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { exportToExcel } from '../lib/exportToExcel' 

// Componentes UI
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'

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

const uiStore = useUiStore()
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

// Reatividade (Lógica Segura)
watch([selectedPeriod, activeTab], async ([newPeriod, newTab]) => {
  if (newPeriod) {
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
  }
}, { immediate: true })

// --- Lógica de Exportação ---
async function handleExport() {
  if (!selectedPeriod.value) return

  // Se a lista de histórico estiver vazia (ex: usuário está na aba Visão Geral),
  // precisamos buscar os dados antes de exportar.
  if (dashboardStore.recentEvaluations.length === 0) {
    const parts = selectedPeriod.value.split('-')
    uiStore.showToast('Preparando dados para exportação...', 'info')
    await dashboardStore.fetchRecentHistory(Number(parts[1]), Number(parts[0]))
  }

  if (dashboardStore.recentEvaluations.length === 0) {
    uiStore.showToast('Não há dados neste período para exportar.', 'warning')
    return
  }

  // Mapeia para formato do Excel
  const dataToExport = dashboardStore.recentEvaluations.map(item => ({
    'Data': formatDate(item.created_at),
    'Setor': item.setor_nome,
    'Nota': item.nota,
    'Responsável': item.responsible_name || '',
    'Pontos de Atenção': item.issues.join(', '),
    'Observações': item.cleanObservation || '',
    'Avaliador': 'Ver no sistema' 
  }))

  exportToExcel(dataToExport, `Relatorio_5S_${selectedPeriod.value}`)
  uiStore.showToast('Download iniciado!', 'success')
}

// Configurações Gráficas
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: '#9ca3af',
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

// Formatação com correção de UTC
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
  })
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-teal-600"></i> Dashboard
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Indicadores de desempenho e evolução 5S.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <select 
          v-model="selectedPeriod"
          class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full sm:w-48 p-2.5 outline-none cursor-pointer shadow-sm transition-all"
        >
          <option value="" disabled>Selecione...</option>
          <option v-for="p in dashboardStore.availablePeriods" :key="p.id" :value="p.id">
            {{ p.label }}
          </option>
        </select>

        <AppButton 
          @click="handleExport" 
          variant="secondary"
          icon="fa-solid fa-file-excel"
          class="w-full sm:w-auto"
          title="Baixar planilha deste mês"
        >
          Excel
        </AppButton>

        <AppButton 
          @click="uiStore.openEvaluationModal()" 
          icon="fa-solid fa-clipboard-check"
          class="w-full sm:w-auto shadow-lg shadow-teal-500/30"
        >
          Nova Avaliação
        </AppButton>
      </div>
    </header>

    <div class="flex border-b border-gray-200 dark:border-gray-700">
      <button 
        @click="activeTab = 'overview'"
        class="flex-1 sm:flex-none py-3 px-6 font-medium text-sm border-b-2 transition-colors focus:outline-none"
        :class="activeTab === 'overview' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
      >
        <i class="fa-solid fa-chart-pie mr-2"></i> Visão Geral
      </button>
      <button 
        @click="activeTab = 'history'"
        class="flex-1 sm:flex-none py-3 px-6 font-medium text-sm border-b-2 transition-colors focus:outline-none"
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
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppCard class="p-4 flex flex-col items-center relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Média</span>
          <span class="text-4xl font-black tracking-tighter" :class="scoreColor">
            {{ dashboardStore.kpis.average_score }}
          </span>
          <span class="text-xs text-gray-400 mt-2 font-medium">Meta: 19.0</span>
        </AppCard>

        <AppCard class="p-4 flex flex-col items-center relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avaliações</span>
          <span class="text-4xl font-black text-gray-700 dark:text-white tracking-tighter">
            {{ dashboardStore.kpis.total_evaluations }}
          </span>
        </AppCard>

        <AppCard class="p-4 flex flex-col items-center relative overflow-hidden text-center justify-center">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Melhor Setor</span>
          <span class="text-lg font-bold text-gray-800 dark:text-white leading-tight">
            {{ dashboardStore.kpis.top_sector }}
          </span>
          <span v-if="dashboardStore.medalLists.gold.length > 0" class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
             Líder
          </span>
        </AppCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="space-y-3 h-80 overflow-y-auto custom-scrollbar pr-1">
             
             <div class="border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3">
               <h4 class="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase mb-2 flex justify-between sticky top-0">
                 <span>🥇 Ouro</span>
                 <span class="bg-white dark:bg-yellow-900 px-2 rounded text-yellow-700 dark:text-yellow-300">{{ dashboardStore.medalLists.gold.length }}</span>
               </h4>
               <div class="space-y-1">
                 <div v-for="s in dashboardStore.medalLists.gold" :key="s.sector_id" class="flex justify-between text-sm text-gray-700 dark:text-gray-300 p-1 hover:bg-white/50 rounded transition">
                   <span>{{ s.sector_name }}</span>
                   <span class="font-bold text-yellow-600 dark:text-yellow-500">{{ s.average }}</span>
                 </div>
                 <div v-if="!dashboardStore.medalLists.gold.length" class="text-xs text-gray-400 italic">Nenhum setor nesta categoria.</div>
               </div>
             </div>

             <div class="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
               <h4 class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2 flex justify-between">
                 <span>🥈 Prata</span>
                 <span class="bg-white dark:bg-gray-700 px-2 rounded">{{ dashboardStore.medalLists.silver.length }}</span>
               </h4>
               <div class="space-y-1">
                 <div v-for="s in dashboardStore.medalLists.silver" :key="s.sector_id" class="flex justify-between text-sm text-gray-700 dark:text-gray-300 p-1 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition">
                   <span>{{ s.sector_name }}</span>
                   <span class="font-bold text-gray-500 dark:text-gray-400">{{ s.average }}</span>
                 </div>
                 <div v-if="!dashboardStore.medalLists.silver.length" class="text-xs text-gray-400 italic">Nenhum setor nesta categoria.</div>
               </div>
             </div>

             <div class="border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3">
               <h4 class="text-xs font-bold text-orange-800 dark:text-orange-400 uppercase mb-2 flex justify-between">
                 <span>🥉 Atenção</span>
                 <span class="bg-white dark:bg-orange-900 px-2 rounded text-orange-700 dark:text-orange-300">{{ dashboardStore.medalLists.bronze.length }}</span>
               </h4>
               <div class="space-y-1">
                 <div v-for="s in dashboardStore.medalLists.bronze" :key="s.sector_id" class="flex justify-between text-sm text-gray-700 dark:text-gray-300 p-1 hover:bg-white/50 rounded transition">
                   <span>{{ s.sector_name }}</span>
                   <span class="font-bold text-orange-600 dark:text-orange-500">{{ s.average }}</span>
                 </div>
                 <div v-if="!dashboardStore.medalLists.bronze.length" class="text-xs text-gray-400 italic">Nenhum setor nesta categoria.</div>
               </div>
             </div>
          </div>

          <AppCard class="p-2 flex flex-col h-80">
              <h3 class="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">Distribuição</h3>
             <div class="flex-1 relative">
                <Pie v-if="chartData" :data="chartData" :options="chartOptions" />
                <div v-else class="flex h-full items-center justify-center text-gray-400 text-sm">Sem dados suficientes.</div>
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
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4b5563; }

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(5px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>