<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDashboardStore } from '../stores/dashboardStore'
import { useUiStore } from '../stores/uiStore'

import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'

import { Bar, Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Colors,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Colors,
  ChartDataLabels,
)

const dashboardStore = useDashboardStore()
const uiStore = useUiStore()

const selectedPeriod = ref('')

onMounted(async () => {
  await dashboardStore.fetchAvailablePeriods()

  const firstPeriod = dashboardStore.availablePeriods[0]
  if (firstPeriod) {
    selectedPeriod.value = firstPeriod.id
  }
})

watch(selectedPeriod, (newPeriod) => {
  if (newPeriod) {
    const parts = newPeriod.split('-')

    const part0 = parts[0]
    const part1 = parts[1]

    if (parts.length === 2 && part0 && part1) {
      const year = parseInt(part0, 10)
      const month = parseInt(part1, 10)

      if (!isNaN(year) && !isNaN(month)) {
        dashboardStore.fetchDashboardData(month, year)
      }
    }
  }
})

const commonChartOptions = (isDark: boolean) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: isDark ? '#cbd5e1' : '#4b5563',
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: isDark ? '#374151' : '#ffffff',
      titleColor: isDark ? '#f9fafb' : '#374151',
      bodyColor: isDark ? '#f9fafb' : '#374151',
      borderColor: isDark ? '#4b5563' : '#e5e7eb',
      borderWidth: 1,
    },
    datalabels: {
      color: isDark ? '#ffffff' : '#374151',
      anchor: 'end' as const,
      align: 'end' as const,
      font: {
        weight: 'bold' as const,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: isDark ? '#9ca3af' : '#6b7280',
      },
      grid: {
        color: isDark ? '#374151' : '#e5e7eb',
      },
    },
    x: {
      ticks: {
        color: isDark ? '#9ca3af' : '#6b7280',
      },
      grid: {
        display: false,
      },
    },
  },
})

const barChartOptions = computed(() =>
  commonChartOptions(uiStore.theme !== 'light'),
)
const pieChartOptions = computed(() => ({
  ...commonChartOptions(uiStore.theme !== 'light'),
  scales: {
    y: { display: false },
    x: { display: false },
  },
  plugins: {
    ...commonChartOptions(uiStore.theme !== 'light').plugins,
    datalabels: {
      color: '#ffffff',
      anchor: 'center' as const,
      align: 'center' as const,
      font: {
        weight: 'bold' as const,
        size: 14,
      },
      formatter: (value: number) => value,
    },
  },
}))

const worstSectorsChartData = computed(() => {
  if (!dashboardStore.worstSectors) return null
  return {
    labels: dashboardStore.worstSectors.map((s) => s.name),
    datasets: [
      {
        label: 'Pontuação Média',
        data: dashboardStore.worstSectors.map((s) =>
          s.average_score.toFixed(1),
        ),
      },
    ],
  }
})

const worstItemsChartData = computed(() => {
  if (!dashboardStore.worstItems) return null

  const worstItems = dashboardStore.worstItems
  const organicos = worstItems['Orgânicos Misturados'] ?? 0
  const sanitarios = worstItems['Papéis Sanitários'] ?? 0
  const outros = worstItems['Outros Não Recicláveis'] ?? 0
  const nivel = worstItems['Nível dos Coletores'] ?? 0

  return {
    labels: [
      `Orgânicos (${organicos})`,
      `Sanitários (${sanitarios})`,
      `Outros (${outros})`,
      `Nível (${nivel})`,
    ],
    datasets: [
      {
        label: 'Contagem de "Regular"',
        data: [organicos, sanitarios, outros, nivel],
      },
    ],
  }
})
</script>

<template>
  <BaseModal class="w-full max-w-6xl" v-slot="{ titleId }">
    <ModalHeader :titleId="titleId">
      <i class="fa-solid fa-chart-pie mr-3 text-primary"></i>
      Dashboard de Desempenho
    </ModalHeader>

    <div class="flex-shrink-0 border-b border-border-light p-4">
      <div class="flex items-center justify-center gap-4">
        <label for="dash-period" class="font-medium text-text-secondary"
          >Período:</label
        >

        <select
          v-model="selectedPeriod"
          id="dash-period"
          class="appearance-none rounded-lg border border-border-light bg-tertiary py-2 pl-3 pr-8 text-text-primary shadow-sm outline-none transition-all
                 focus-ring:ring-2 focus-ring:ring-primary
                 bg-no-repeat [background-position:right_0.5rem_center] bg-[length:1.5em_1.5em]
                 bg-[url(&quot;data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e&quot;)]"
        >
          <option
            v-if="dashboardStore.availablePeriods.length === 0"
            value=""
            disabled
          >
            Carregando...
          </option>
          <option
            v-for="period in dashboardStore.availablePeriods"
            :key="period.id"
            :value="period.id"
          >
            {{ period.label }}
          </option>
        </select>
        </div>
    </div>

    <div class="flex-1 overflow-auto bg-bg-primary p-6">
      <div
        v-if="dashboardStore.isLoading"
        class="flex h-full items-center justify-center"
      >
        <div class="text-center text-text-secondary">
          <i class="fa-solid fa-spinner fa-spin text-4xl"></i>
          <p class="mt-4">Buscando dados...</p>
        </div>
      </div>

      <div
        v-else-if="dashboardStore.kpis"
        class="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div
          class="col-span-1 grid grid-cols-2 gap-6 rounded-lg border border-border-light bg-secondary p-6 shadow-sm lg:col-span-2 lg:grid-cols-3"
        >
          <div class="rounded-lg bg-tertiary p-4 text-center">
            <span class="block text-4xl font-bold text-primary">{{
              dashboardStore.kpis?.average_score.toFixed(1)
            }}</span>
            <span class="mt-1 block text-sm font-medium text-text-secondary"
              >Pontuação Média Geral</span
            >
          </div>
          <div class="rounded-lg bg-tertiary p-4 text-center">
            <span class="block text-4xl font-bold text-primary"
              >{{ dashboardStore.kpis?.success_rate.toFixed(0) }}%</span
            >
            <span class="mt-1 block text-sm font-medium text-text-secondary"
              >Taxa de Sucesso (Ouro/Prata)</span
            >
          </div>
          <div
            class="rounded-lg bg-tertiary p-4 text-center lg:col-auto col-span-2"
          >
            <span class="block text-4xl font-bold text-primary">{{
              dashboardStore.kpis?.total_sectors_evaluated
            }}</span>
            <span class="mt-1 block text-sm font-medium text-text-secondary"
              >Salas Avaliadas</span
            >
          </div>
        </div>

        <div
          class="col-span-1 grid grid-cols-1 gap-6 rounded-lg border border-border-light bg-secondary p-6 shadow-sm lg:col-span-2 sm:grid-cols-3"
        >
          <div class="rounded-lg bg-tertiary p-4">
            <h3
              class="mb-3 border-b-2 border-warning pb-2 text-lg font-semibold text-text-primary"
            >
              🥇 Salas Ouro (Acima de 40 pts)
            </h3>
            <ul
              v-if="dashboardStore.medalLists?.gold?.length"
              class="ml-5 list-disc text-text-secondary"
            >
              <li
                v-for="item in dashboardStore.medalLists.gold"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
            <p v-else class="text-sm text-text-secondary">Nenhuma</p>
          </div>
          <div class="rounded-lg bg-tertiary p-4">
            <h3
              class="mb-3 border-b-2 border-gray-400 pb-2 text-lg font-semibold text-text-primary"
            >
              🥈 Salas Prata (35-39 pts)
            </h3>
            <ul
              v-if="dashboardStore.medalLists?.silver?.length"
              class="ml-5 list-disc text-text-secondary"
            >
              <li
                v-for="item in dashboardStore.medalLists.silver"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
            <p v-else class="text-sm text-text-secondary">Nenhuma</p>
          </div>

          <div class="rounded-lg bg-tertiary p-4">
            <h3
              class="mb-3 border-b-2 border-orange-400 pb-2 text-lg font-semibold text-text-primary"
            >
              🥉 Salas Bronze (Abaixo de 34 pts)
            </h3>
            <ul
              v-if="dashboardStore.medalLists?.bronze?.length"
              class="ml-5 list-disc text-text-secondary"
            >
              <li
                v-for="item in dashboardStore.medalLists.bronze"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
            <p v-else class="text-sm text-text-secondary">Nenhuma</p>
          </div>
        </div>

        <div
          class="rounded-lg border border-border-light bg-secondary p-6 shadow-sm"
        >
          <h3 class="mb-4 text-center text-lg font-semibold text-text-primary">
            As 5 Salas com Pior Pontuação Média
          </h3>
          <div class="relative h-64">
            <Bar
              v-if="worstSectorsChartData"
              :data="worstSectorsChartData"
              :options="barChartOptions"
            />
          </div>
        </div>

        <div
          class="rounded-lg border border-border-light bg-secondary p-6 shadow-sm"
        >
          <h3 class="mb-4 text-center text-lg font-semibold text-text-primary">
            Maiores Problemas (Contagem de "Regular")
          </h3>
          <div class="relative h-64">
            <Pie
              v-if="worstItemsChartData"
              :data="worstItemsChartData"
              :options="pieChartOptions"
            />
          </div>
        </div>
      </div>

      <div v-else class="flex h-full items-center justify-center">
        <div class="text-center text-text-secondary">
          <i class="fa-solid fa-cloud-exclamation text-4xl"></i>
          <p class="mt-4">
            Não foi possível carregar os dados ou não há registros para este
            período.
          </p>
        </div>
      </div>
    </div>
  </BaseModal>
</template>