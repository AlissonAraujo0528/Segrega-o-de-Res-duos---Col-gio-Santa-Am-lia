<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRankingStore } from '../stores/rankingStore'
import { useAuthStore } from '../stores/authStore'
import { useEvaluationStore } from '../stores/evaluationStore'
import { useUiStore } from '../stores/uiStore'

// Componentes UI do Design System
import AppButton from '../components/ui/AppButton.vue'
// AppCard removido pois não está sendo usado no template atual

const rankingStore = useRankingStore()
const authStore = useAuthStore()
const evaluationStore = useEvaluationStore()
const uiStore = useUiStore()

const localFilterText = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined

const isAdmin = computed(() => authStore.userRole === 'admin')

// Helper de formatação de data
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

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

// --- AÇÃO DE EDITAR CORRIGIDA ---
async function handleEdit(id: string) {
  // 1. Carrega os dados na store de avaliação
  await evaluationStore.loadEvaluationForEdit(id)
  
  // 2. Muda a aba para o formulário de avaliação na Home
  uiStore.setActiveTab('evaluation')
  
  uiStore.notify('Carregando auditoria para edição...', 'info')
}

// --- AÇÃO DE EXCLUIR CORRIGIDA ---
function handleDelete(id: string) {
  if (!isAdmin.value) return
  
  // Usa o novo padrão da uiStore (confirm em vez de showConfirmModal)
  uiStore.confirm({
    title: 'Mover para a Lixeira?',
    message: 'Tem certeza que deseja mover esta avaliação? Ela sairá do ranking.',
    okButtonText: 'Sim, Mover',
    isDangerous: true, 
    onConfirm: async () => {
      try {
        // Usa o nome correto da action (removeEvaluation)
        const success = await evaluationStore.removeEvaluation(id)
        
        if (success) {
            uiStore.notify('Avaliação movida para a lixeira.', 'success')
            // Recarrega a lista
            await rankingStore.fetchResults(rankingStore.currentPage, localFilterText.value)
        }
      } catch (error: any) {
        uiStore.notify(error.message || 'Erro ao excluir.', 'error')
      }
    }
  })
}

// Utilitário para badge de notas
function getScoreBadgeClass(score: number) {
  if (score >= 19) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
  if (score >= 15) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
}
</script>

<template>
  <div class="space-y-4 animate-fade-in pb-24 md:pb-20">
    
    <header class="flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <i class="fa-solid fa-list-check text-teal-600"></i> Histórico
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Gerencie as auditorias.
          </p>
        </div>
        
        <AppButton 
          @click="rankingStore.exportAllResults"
          :loading="rankingStore.loading"
          :disabled="rankingStore.results.length === 0"
          variant="secondary"
          size="sm"
        >
          <i class="fa-solid fa-file-excel sm:mr-2"></i>
          <span class="hidden sm:inline">Exportar</span>
        </AppButton>
      </div>

      <div class="relative w-full">
        <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        <input
          v-model="localFilterText"
          type="search"
          placeholder="Buscar setor ou avaliador..."
          class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-base focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm dark:text-white"
        />
      </div>
    </header>

    <div v-if="rankingStore.loading" class="py-12 text-center text-teal-600">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl"></i>
        <p class="text-sm mt-2 font-medium">Carregando...</p>
    </div>

    <div v-else-if="rankingStore.results.length === 0" class="py-12 text-center text-gray-400">
        <i class="fa-solid fa-magnifying-glass text-3xl opacity-30"></i>
        <p class="mt-2">Nenhum resultado encontrado.</p>
    </div>

    <div v-else>
      
      <div class="grid grid-cols-1 gap-3 sm:hidden">
        <div 
          v-for="item in rankingStore.results" 
          :key="item.id" 
          class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3"
          @click="isAdmin ? handleEdit(item.id) : null"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">{{ formatDate(item.date) }}</span>
              <h3 class="font-bold text-gray-800 dark:text-white text-lg leading-tight">{{ item.sector_name }}</h3>
              <p class="text-xs text-gray-500 mt-1 truncate max-w-[200px]">Resp: {{ item.responsible }}</p>
            </div>
            <span class="px-3 py-1 rounded-lg text-sm font-bold border shrink-0" :class="getScoreBadgeClass(item.score)">
              {{ item.score }} pts
            </span>
          </div>

          <div class="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700 mt-1">
             <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <i class="fa-solid fa-user text-[10px]"></i>
                </div>
                {{ item.evaluator }}
             </div>

             <div v-if="isAdmin" class="flex gap-2">
                <button @click.stop="handleEdit(item.id)" class="p-2.5 text-teal-600 bg-teal-50 dark:bg-teal-900/20 rounded-lg active:scale-95 transition-transform">
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button @click.stop="handleDelete(item.id)" class="p-2.5 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg active:scale-95 transition-transform">
                  <i class="fa-solid fa-trash"></i>
                </button>
             </div>
          </div>
        </div>
      </div>

      <div class="hidden sm:block overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <table class="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Setor</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pontos</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responsável</th>
              <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avaliador</th>
              <th v-if="isAdmin" class="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            <tr v-for="item in rankingStore.results" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(item.date) }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ item.sector_name }}
                </div>
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm" :class="getScoreBadgeClass(item.score)">
                  {{ item.score }} pts
                </span>
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ item.responsible }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                    <i class="fa-solid fa-user"></i>
                  </div>
                  {{ item.evaluator }}
                </div>
              </td>

              <td v-if="isAdmin" class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex justify-end gap-2">
                    <AppButton size="sm" variant="ghost" icon="fa-solid fa-pencil" @click.stop="handleEdit(item.id)" title="Editar" />
                    <AppButton size="sm" variant="ghost" class="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" icon="fa-solid fa-trash" @click.stop="handleDelete(item.id)" title="Excluir" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bg-gray-50 dark:bg-gray-800/50 px-4 py-4 rounded-b-xl border-t border-gray-200 dark:border-gray-700 flex justify-between items-center mt-auto">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          Pág. <strong>{{ rankingStore.currentPage }}</strong> de {{ rankingStore.totalPages }}
        </span>

        <div class="flex gap-2">
          <AppButton 
            size="sm" variant="secondary" 
            :disabled="rankingStore.currentPage === 1" 
            @click="rankingStore.fetchResults(rankingStore.currentPage - 1, localFilterText)"
          >
            Ant
          </AppButton>
          <AppButton 
            size="sm" variant="secondary" 
            :disabled="rankingStore.currentPage >= rankingStore.totalPages" 
            @click="rankingStore.fetchResults(rankingStore.currentPage + 1, localFilterText)"
          >
            Próx
          </AppButton>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>