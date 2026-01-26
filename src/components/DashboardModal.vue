<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useDashboardStore } from '../stores/dashboardStore'
import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'

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

onMounted(async () => {
  await dashboardStore.fetchAvailablePeriods()
  if (dashboardStore.availablePeriods.length > 0) {
    selectedPeriod.value = dashboardStore.availablePeriods[0].id
  }
})

// Busca dados quando muda o período ou a aba
watch([selectedPeriod, activeTab], async ([newPeriod, newTab]) => {
  if (newPeriod) {
    const [year, month] = newPeriod.split('-').map(Number)
    if (newTab === 'overview') {
      await dashboardStore.fetchDashboardData(month, year)
    } else {
      await dashboardStore.fetchRecentHistory(month, year)
    }
  }
})

// --- Configuração do Gráfico ---
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: '#4b5563',
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
  if (score >= 19) return 'text-green-600'
  if (score >= 15) return 'text-yellow-600'
  return 'text-red-600'
})

// Formatação de data simples
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
  })
}
</script>

<template>
  <BaseModal class="w-full max-w-6xl" v-slot="{ titleId }">
    
    <ModalHeader :titleId="titleId">
      <div class="flex flex-col sm:flex-row justify-between items-center w-full pr-8">
        <div class="flex items-center gap-3">
          <i class="fa-solid fa-chart-line text-teal-600"></i>
          <span>Dashboard de Desempenho</span>
        </div>
        
        <div class="mt-3 sm:mt-0 w-full sm:w-auto">
          <select 
            v-model="selectedPeriod"
            class="w-full sm:w-48 bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none cursor-pointer"
          >
            <option value="" disabled>Selecione...</option>
            <option v-for="p in dashboardStore.availablePeriods" :key="p.id" :value="p.id">
              {{ p.label }}
            </option>
          </select>
        </div>
      </div>
    </ModalHeader>

    <div class="flex border-b border-gray-200 bg-white px-6">
      <button 
        @click="activeTab = 'overview'"
        class="py-4 px-6 font-medium text-sm border-b-2 transition-colors focus:outline-none"
        :class="activeTab === 'overview' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        <i class="fa-solid fa-chart-pie mr-2"></i> Visão Geral
      </button>
      <button 
        @click="activeTab = 'history'"
        class="py-4 px-6 font-medium text-sm border-b-2 transition-colors focus:outline-none"
        :class="activeTab === 'history' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        <i class="fa-solid fa-list-check mr-2"></i> Histórico & Detalhes
      </button>
    </div>

    <div class="p-6 bg-gray-50/50 min-h-[500px] overflow-y-auto max-h-[75vh]">
      
      <div v-if="dashboardStore.isLoading" class="flex flex-col items-center justify-center h-64 text-gray-400">
        <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-3 text-teal-500"></i>
        <p>Carregando dados...</p>
      </div>

      <div v-else-if="activeTab === 'overview'" class="space-y-8 animate-fade-in">
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600"></div>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Média</span>
            <span class="text-5xl font-black tracking-tighter" :class="scoreColor">
              {{ dashboardStore.kpis.average_score }}
            </span>
            <span class="text-xs text-gray-400 mt-2 font-medium">Meta: 19.0</span>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avaliações</span>
            <span class="text-5xl font-black text-gray-700 tracking-tighter">
              {{ dashboardStore.kpis.total_evaluations }}
            </span>
            <span class="text-xs text-gray-400 mt-2 font-medium">Registros no mês</span>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center relative overflow-hidden text-center justify-center">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Melhor Setor</span>
            <span class="text-lg font-bold text-gray-800 leading-tight">
              {{ dashboardStore.kpis.top_sector }}
            </span>
            <span v-if="dashboardStore.medalLists.gold.length > 0" class="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              <i class="fa-solid fa-trophy mr-1"></i> Líder
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div class="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden flex flex-col h-96">
              <div class="bg-yellow-50 p-3 border-b border-yellow-100 flex justify-between items-center">
                <h3 class="font-bold text-yellow-800 flex items-center gap-2">
                  <span class="bg-yellow-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm"><i class="fa-solid fa-star"></i></span>
                  Ouro
                </h3>
                <span class="text-xs font-bold bg-white text-yellow-700 px-2 py-1 rounded-md shadow-sm">{{ dashboardStore.medalLists.gold.length }}</span>
              </div>
              <div class="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin">
                <div v-for="s in dashboardStore.medalLists.gold" :key="s.sector_id" class="flex justify-between items-center p-2 hover:bg-yellow-50 rounded-lg transition-colors group">
                  <span class="text-sm font-medium text-gray-600 group-hover:text-yellow-900">{{ s.sector_name }}</span>
                  <span class="text-sm font-bold text-yellow-600">{{ s.average }}</span>
                </div>
                 <div v-if="dashboardStore.medalLists.gold.length === 0" class="text-center p-4 text-gray-400 text-sm italic">Nenhum setor.</div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-96">
              <div class="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="font-bold text-gray-700 flex items-center gap-2">
                  <span class="bg-gray-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm"><i class="fa-solid fa-medal"></i></span>
                  Prata
                </h3>
                <span class="text-xs font-bold bg-white text-gray-600 px-2 py-1 rounded-md shadow-sm">{{ dashboardStore.medalLists.silver.length }}</span>
              </div>
              <div class="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin">
                <div v-for="s in dashboardStore.medalLists.silver" :key="s.sector_id" class="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg transition-colors group">
                  <span class="text-sm font-medium text-gray-600 group-hover:text-gray-900">{{ s.sector_name }}</span>
                  <span class="text-sm font-bold text-gray-500">{{ s.average }}</span>
                </div>
                 <div v-if="dashboardStore.medalLists.silver.length === 0" class="text-center p-4 text-gray-400 text-sm italic">Nenhum setor.</div>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden flex flex-col h-96">
              <div class="bg-orange-50 p-3 border-b border-orange-100 flex justify-between items-center">
                <h3 class="font-bold text-orange-800 flex items-center gap-2">
                  <span class="bg-orange-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm"><i class="fa-solid fa-triangle-exclamation"></i></span>
                  Atenção
                </h3>
                <span class="text-xs font-bold bg-white text-orange-700 px-2 py-1 rounded-md shadow-sm">{{ dashboardStore.medalLists.bronze.length }}</span>
              </div>
              <div class="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin">
                <div v-for="s in dashboardStore.medalLists.bronze" :key="s.sector_id" class="flex justify-between items-center p-2 hover:bg-orange-50 rounded-lg transition-colors group">
                  <span class="text-sm font-medium text-gray-600 group-hover:text-orange-900">{{ s.sector_name }}</span>
                  <span class="text-sm font-bold text-orange-600">{{ s.average }}</span>
                </div>
                 <div v-if="dashboardStore.medalLists.bronze.length === 0" class="text-center p-4 text-gray-400 text-sm italic">Nenhum! Parabéns!</div>
              </div>
            </div>

          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-96">
            <h3 class="text-center text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Distribuição</h3>
            <div class="flex-1 relative">
              <Pie v-if="chartData" :data="chartData" :options="chartOptions" />
              <div v-else class="flex h-full items-center justify-center text-gray-400 text-sm">Sem dados</div>
            </div>
          </div>

        </div>

      </div>

      <div v-else class="space-y-4 animate-fade-in">
        
        <div v-if="dashboardStore.recentEvaluations.length === 0" class="text-center py-12">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4 text-gray-400">
            <i class="fa-regular fa-folder-open text-3xl"></i>
          </div>
          <p class="text-gray-500">Nenhum registro encontrado para este período.</p>
        </div>

        <div v-for="item in dashboardStore.recentEvaluations" :key="item.id" 
             class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow group">
          
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                {{ item.setores?.nome }}
                <span v-if="item.nota === 20" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Perfeito</span>
              </h4>
              <div class="flex gap-3 text-xs text-gray-500 mt-1">
                <span class="flex items-center gap-1"><i class="fa-regular fa-calendar"></i> {{ formatDate(item.created_at) }}</span>
                <span class="flex items-center gap-1"><i class="fa-regular fa-user"></i> {{ item.responsible_name || 'N/A' }}</span>
              </div>
            </div>

            <div class="flex flex-col items-end">
              <span class="text-3xl font-black leading-none" 
                :class="item.nota >= 19 ? 'text-green-600' : item.nota >= 15 ? 'text-yellow-600' : 'text-red-600'">
                {{ item.nota }}
              </span>
              <span class="text-[10px] uppercase font-bold text-gray-400">Pontos</span>
            </div>
          </div>

          <div v-if="item.issues && item.issues.length > 0" class="mt-3 bg-red-50 p-3 rounded-lg border border-red-100">
            <p class="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-2">
              <i class="fa-solid fa-circle-exclamation"></i> Pontos de Atenção:
            </p>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <li v-for="issue in item.issues" :key="issue" class="text-sm text-red-800 flex items-start gap-2">
                <span class="text-red-400 mt-1">•</span> {{ issue }}
              </li>
            </ul>
          </div>

          <div v-if="item.cleanObservation" class="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic border border-gray-100">
            "{{ item.cleanObservation }}"
          </div>

          <div v-if="item.foto_url" class="mt-3 pt-3 border-t border-gray-100 flex justify-end">
             <a :href="item.foto_url" target="_blank" class="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1 transition-colors">
               <i class="fa-solid fa-image"></i> Ver Evidência Fotográfica
             </a>
          </div>

        </div>
      </div>

    </div>

    <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end px-6 pb-6">
      <button 
        @click="uiStore.closeDashboardModal"
        class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
      >
        Fechar
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(5px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>