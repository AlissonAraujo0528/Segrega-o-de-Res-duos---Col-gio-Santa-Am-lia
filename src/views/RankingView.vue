<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRankingStore } from '../stores/rankingStore'
import { useAuthStore } from '../stores/authStore'
import { useEvaluationStore } from '../stores/evaluationStore'
import { useUiStore } from '../stores/uiStore'

// Componentes UI do Design System
import AppButton from '../components/ui/AppButton.vue'
import AppCard from '../components/ui/AppCard.vue'

const rankingStore = useRankingStore()
const authStore = useAuthStore()
const evaluationStore = useEvaluationStore()
const uiStore = useUiStore()

const localFilterText = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined

const isAdmin = computed(() => authStore.userRole === 'admin')

onMounted(() => {
  localFilterText.value = rankingStore.filterText
  rankingStore.fetchResults(1, localFilterText.value)
})

watch(localFilterText, (newFilter) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    rankingStore.fetchResults(1, newFilter)
  }, 500)
})

function handleEdit(id: string) {
  rankingStore.fetchEvaluationForEdit(id)
}

function handleDelete(id: string) {
  if (!isAdmin.value) return
  
  uiStore.showConfirmModal({
    title: 'Mover para a Lixeira?',
    message: 'Tem certeza que deseja mover esta avaliação? Ela sairá do ranking.',
    okButtonText: 'Sim, Mover',
    okButtonClass: 'bg-red-600 hover:bg-red-700 text-white', 
    onConfirm: async () => {
      try {
        await evaluationStore.deleteEvaluation(id)
        uiStore.showToast('Avaliação movida para a lixeira.', 'success')
        await rankingStore.fetchResults(rankingStore.currentPage, localFilterText.value)
      } catch (error: any) {
        uiStore.showToast(error.message, 'error')
      }
    }
  })
}

// Utilitário para badge de notas
function getScoreBadgeClass(score: number) {
  if (score >= 19) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  if (score >= 15) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}
</script>

<template>
  <div class="space-y-6">
    
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-ranking-star text-teal-600"></i> Ranking de Salas
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Visão geral das pontuações ordenadas.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div class="relative flex-1 sm:w-64">
          <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="localFilterText"
            type="search"
            placeholder="Buscar setor ou avaliador..."
            class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm dark:text-white"
          />
        </div>

        <AppButton 
          @click="rankingStore.exportAllResults"
          :loading="rankingStore.isLoading"
          :disabled="rankingStore.results.length === 0"
          variant="secondary"
          icon="fa-solid fa-file-excel"
        >
          Exportar
        </AppButton>
      </div>
    </header>

    <AppCard class="flex flex-col min-h-[400px]">
      
      <div class="overflow-x-auto flex-1">
        <table class="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th v-for="h in ['Pos.', 'Setor / Sala', 'Pontos', 'Data', 'Avaliador', isAdmin ? 'Ações' : '']" :key="h"
                  class="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            
            <tr v-if="rankingStore.isLoading">
              <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                 <i class="fa-solid fa-circle-notch fa-spin text-3xl text-teal-500 mb-3"></i>
                 <p class="text-sm font-medium">Carregando dados...</p>
              </td>
            </tr>

            <tr v-else-if="rankingStore.results.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                 <i class="fa-solid fa-magnifying-glass text-3xl mb-3 opacity-30"></i>
                 <p>{{ localFilterText ? 'Nenhum resultado encontrado.' : 'Nenhuma avaliação registrada.' }}</p>
              </td>
            </tr>

            <tr v-for="(item, index) in rankingStore.results" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
              
              <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                #{{ (rankingStore.currentPage - 1) * 10 + index + 1 }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ item.setor_nome }}
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm border border-transparent" :class="getScoreBadgeClass(item.score)">
                  {{ item.score }}
                </span>
                <span class="text-xs text-gray-400 ml-1 hidden sm:inline">/ 20</span>
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ item.data_formatada }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                    <i class="fa-solid fa-user"></i>
                  </div>
                  {{ item.evaluator }}
                </div>
              </td>

              <td v-if="isAdmin" class="px-6 py-4 whitespace-nowrap flex gap-2">
                <AppButton size="sm" variant="ghost" icon="fa-solid fa-pencil" @click="handleEdit(item.id)" title="Editar" />
                <AppButton size="sm" variant="ghost" class="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" icon="fa-solid fa-trash" @click="handleDelete(item.id)" title="Excluir" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center mt-auto">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          Página <strong>{{ rankingStore.currentPage }}</strong> de {{ rankingStore.totalPages }}
        </span>

        <div class="flex gap-2">
          <AppButton 
            size="sm" variant="secondary" 
            :disabled="rankingStore.currentPage === 1" 
            @click="rankingStore.fetchResults(rankingStore.currentPage - 1, localFilterText)"
          >
            Anterior
          </AppButton>
          <AppButton 
            size="sm" variant="secondary" 
            :disabled="rankingStore.currentPage >= rankingStore.totalPages" 
            @click="rankingStore.fetchResults(rankingStore.currentPage + 1, localFilterText)"
          >
            Próxima
          </AppButton>
        </div>
      </div>

    </AppCard>
  </div>
</template>