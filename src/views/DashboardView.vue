<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useDashboardStore } from '../stores/dashboardStore';

// UI Components
import AppCard from '../components/ui/AppCard.vue';
import AppButton from '../components/ui/AppButton.vue';

// Chart.js & Vue-Chartjs
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'vue-chartjs';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const store = useDashboardStore();

onMounted(() => {
  store.loadDashboard();
});

// --- Configuração de Cores e Estilos ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { font: { family: 'ui-sans-serif, system-ui' }, usePointStyle: true }
    }
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
    x: { grid: { display: false } }
  }
};

// --- Dados dos Gráficos (Computados da Store) ---

const historyChartData = computed(() => ({
  labels: store.data.history.labels,
  datasets: [{
    label: 'Média Mensal',
    data: store.data.history.data,
    borderColor: '#0d9488', // Teal-600
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 4,
    pointHoverRadius: 6
  }]
}));

const sectorChartData = computed(() => ({
  labels: store.data.bySector.labels,
  datasets: [{
    label: 'Performance Média',
    data: store.data.bySector.data,
    backgroundColor: '#f59e0b', // Amber-500
    borderRadius: 6
  }]
}));

const complianceChartData = computed(() => ({
  labels: store.data.compliance.labels,
  datasets: [{
    data: store.data.compliance.data,
    backgroundColor: ['#22c55e', '#ef4444'], // Green, Red
    hoverOffset: 4
  }]
}));

// --- Helpers Visuais ---
const growthClass = computed(() => {
  return store.data.kpis.monthlyGrowth >= 0 
    ? 'text-green-600 bg-green-50' 
    : 'text-red-600 bg-red-50';
});
</script>

<template>
  <div class="space-y-6 animate-fade-in pb-20">
    
    <header class="flex flex-col md:flex-row justify-between md:items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-teal-600"></i> Dashboard Analítico
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Visão consolidada dos últimos 6 meses.
        </p>
      </div>
      <AppButton 
        icon="fa-solid fa-rotate-right" 
        variant="secondary" 
        :loading="store.loading"
        @click="store.refresh"
      >
        Atualizar Dados
      </AppButton>
    </header>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <AppCard class="p-4 relative overflow-hidden border-l-4 border-l-teal-500">
        <div class="text-gray-500 text-xs font-bold uppercase tracking-wider">Média Geral</div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-black text-gray-800 dark:text-white">{{ store.data.kpis.averageScore }}</span>
          <span class="text-sm text-gray-400">/ 20</span>
        </div>
      </AppCard>

      <AppCard class="p-4 relative overflow-hidden border-l-4 border-l-blue-500">
        <div class="text-gray-500 text-xs font-bold uppercase tracking-wider">Auditorias Realizadas</div>
        <div class="mt-2 text-3xl font-black text-gray-800 dark:text-white">
          {{ store.data.kpis.totalAudits }}
        </div>
      </AppCard>

      <AppCard class="p-4 relative overflow-hidden border-l-4 border-l-amber-500">
        <div class="text-gray-500 text-xs font-bold uppercase tracking-wider">Setor Destaque</div>
        <div class="mt-2 text-xl font-bold text-gray-800 dark:text-white truncate" :title="store.data.kpis.topSector">
          {{ store.data.kpis.topSector }}
        </div>
        <div class="absolute right-2 top-2 text-amber-500 opacity-20">
          <i class="fa-solid fa-trophy text-4xl"></i>
        </div>
      </AppCard>

      <AppCard class="p-4 relative overflow-hidden border-l-4 border-l-purple-500">
        <div class="text-gray-500 text-xs font-bold uppercase tracking-wider">Crescimento Mensal</div>
        <div class="mt-2 flex items-center gap-2">
          <span 
            class="px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1"
            :class="growthClass"
          >
            <i :class="store.data.kpis.monthlyGrowth >= 0 ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"></i>
            {{ Math.abs(store.data.kpis.monthlyGrowth) }}%
          </span>
          <span class="text-xs text-gray-400">vs. mês anterior</span>
        </div>
      </AppCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <AppCard class="lg:col-span-2 p-4 flex flex-col min-h-[350px]">
        <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4">Evolução da Nota Média</h3>
        <div class="flex-1 relative">
          <Line v-if="!store.loading" :data="historyChartData" :options="chartOptions" />
        </div>
      </AppCard>

      <AppCard class="p-4 flex flex-col min-h-[350px]">
        <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 text-center">Índice de Conformidade</h3>
        <div class="flex-1 relative flex items-center justify-center">
          <Doughnut v-if="!store.loading" :data="complianceChartData" :options="{ ...chartOptions, scales: {} }" />
        </div>
      </AppCard>
    </div>

    <AppCard class="p-4 flex flex-col min-h-[300px]">
      <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4">Top 5 Setores (Média)</h3>
      <div class="flex-1 relative">
        <Bar v-if="!store.loading" :data="sectorChartData" :options="chartOptions" />
      </div>
    </AppCard>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>