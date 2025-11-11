<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'

import { useRankingStore } from '../stores/rankingStore'
import { useAuthStore } from '../stores/authStore'
import { useEvaluationStore } from '../stores/evaluationStore'
import { useUiStore } from '../stores/uiStore'

import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'

const rankingStore = useRankingStore()
const authStore = useAuthStore()
const evaluationStore = useEvaluationStore()
const uiStore = useUiStore()

const localFilterText = ref('')
let debounceTimer: number | undefined = undefined

const isAdmin = computed(() => authStore.userRole === 'admin')

onMounted(() => {
  localFilterText.value = rankingStore.filterText
  rankingStore.fetchResults(1, localFilterText.value)
})

watch(localFilterText, (newFilter) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    rankingStore.fetchResults(1, newFilter)
  }, 300) as unknown as number
})

// --- FUNÇÃO SIMPLIFICADA ---
// Agora o modal apenas chama a store.
// A store (rankingStore) cuidará da permissão de admin e de fechar o modal.
function handleEdit(id: string) {
  rankingStore.fetchEvaluationForEdit(id)
}

// (Esta função está correta)
function handleDelete(id: string) {
  if (!isAdmin.value) return
  
  uiStore.showConfirmModal({
    title: 'Mover para a Lixeira?',
    message: 'Tem certeza que deseja mover esta avaliação para a lixeira? (Ela poderá ser restaurada por um admin)',
    okButtonText: 'Sim, Mover',
    okButtonClass: 'bg-danger hover:bg-danger/90',
    onConfirm: async () => {
      try {
        await evaluationStore.deleteEvaluation(id)
        uiStore.showToast('Avaliação movida para a lixeira.', 'success')
        // Atualiza a lista
        await rankingStore.fetchResults(rankingStore.currentPage, localFilterText.value)
      } catch (error: any) {
        uiStore.showToast(error.message, 'error')
      }
    }
  })
}

// --- FUNÇÃO CORRIGIDA ---
// Altere esta função para chamar a store
function handleExport() {
  // Remove o toast de "não implementado" e chama a função real
  rankingStore.exportAllResults()
}
</script>

<template>
    <BaseModal class="w-full max-w-6xl" v-slot="{ titleId }">
    
    <ModalHeader :titleId="titleId">
      <i class="fa-solid fa-ranking-star mr-3 text-primary"></i>
      Ranking de Salas
    </ModalHeader>

    <div class="p-6 bg-secondary">
      <div class="relative">
        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/70"></i>
        <input
          v-model="localFilterText"
          type="search"
          placeholder="Buscar por setor, avaliador..."
          class="w-full rounded-lg border border-border-light p-3 pl-10 shadow-sm outline-none transition-all
                 focus-ring:ring-2 focus-ring:ring-primary
                 bg-tertiary text-text-primary"
        />
      </div>
    </div>

    <div class="flex-1 overflow-auto px-6 bg-secondary">
      <table class="min-w-full divide-y divide-border-light">
        <thead class="sticky top-0 bg-primary-dark">
          <tr>
            <th class="p-4 text-left text-sm font-semibold text-white">Pos.</th>
            <th class="p-4 text-left text-sm font-semibold text-white">Setor/Sala</th>
            <th class="p-4 text-left text-sm font-semibold text-white">Pontos</th>
            <th class="p-4 text-left text-sm font-semibold text-white">Data</th>
            <th class="p-4 text-left text-sm font-semibold text-white">Avaliador</th>
            <th v-if="isAdmin" class="p-4 text-left text-sm font-semibold text-white">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-light bg-secondary">
          <tr v-if="rankingStore.isLoading || !authStore.isAuthReady">
            <td colspan="6" class="p-12 text-center text-text-secondary">
              <i class="fa-solid fa-spinner fa-spin mr-2"></i> 
              {{ !authStore.isAuthReady ? 'Verificando permissões...' : 'Carregando dados...' }}
            </td>
          </tr>
          <tr v-else-if="rankingStore.results.length === 0">
            <td colspan="6" class="p-12 text-center text-text-secondary">
              {{ localFilterText ? 'Nenhum resultado encontrado.' : 'Nenhuma avaliação cadastrada.' }}
            </td>
          </tr>
          <tr v-for="(item, index) in rankingStore.results" :key="item.id" class="hover:bg-tertiary">
    
            <td class="p-4 text-text-secondary">{{ (rankingStore.currentPage - 1) * 10 + index + 1 }}º</td>
            <td class="p-4 text-text-secondary">{{ item.sectors?.name || 'Setor Inválido' }}</td>
            <td class="p-4 text-text-secondary">{{ item.score }}</td>
            <td class="p-4 text-text-secondary">{{ new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }}</td>
            
            <td class="p-4 text-text-secondary">{{ item.evaluator }}</td>
            
            <td v-if="isAdmin" class="p-4">
              <button
                @click="handleEdit(item.id)"
                title="Editar"
                class="mr-2 rounded-sm text-text-secondary/80 outline-none transition-all
                       hover:text-primary 
                       focus-ring:ring-2 focus-ring:ring-primary/50"
              >
                <i class="fa-solid fa-pencil"></i>
              </button>
              <button 
                @click="handleDelete(item.id)" 
                title="Mover para Lixeira" 
                class="rounded-sm text-text-secondary/80 outline-none transition-all 
                       hover:text-danger 
                       focus-ring:ring-2 focus-ring:ring-danger/50"
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border-light p-6 bg-secondary">
      <div class="flex items-center gap-2">
        <button
          @click="rankingStore.fetchResults(rankingStore.currentPage - 1, localFilterText)"
          :disabled="rankingStore.currentPage === 1 || rankingStore.isLoading"
          class="rounded bg-primary-dark px-4 py-2 text-white outline-none transition-all 
                 disabled:opacity-50
                 focus-ring:ring-2 focus-ring:ring-primary/50"
        >
          &lt; Ant
        </button>
        <span class="text-sm text-text-secondary">
          Página {{ rankingStore.currentPage }} de {{ rankingStore.totalPages }}
        </span>
        <button
          @click="rankingStore.fetchResults(rankingStore.currentPage + 1, localFilterText)"
          :disabled="rankingStore.currentPage >= rankingStore.totalPages || rankingStore.isLoading"
          class="rounded bg-primary-dark px-4 py-2 text-white outline-none transition-all 
                 disabled:opacity-50
                 focus-ring:ring-2 focus-ring:ring-primary/50"
        >
          Próx &gt;
        </button>
      </div>
      <button
        @click="handleExport"
        :disabled="rankingStore.results.length === 0 || rankingStore.isLoading"
        class="rounded bg-success px-5 py-2 font-semibold text-white shadow-sm outline-none transition-all 
               hover:bg-success/90 
               disabled:opacity-50
indisabled:cursor-not-allowed
               focus-ring:ring-2 focus-ring:ring-success/50"
      >
              <i v-if="rankingStore.isLoading" class="fa-solid fa-spinner fa-spin mr-2"></i>
      <i v-else class="fa-solid fa-file-excel mr-2"></i>
      Baixar XLS
      </button>
    </div>

  </BaseModal>
</template>