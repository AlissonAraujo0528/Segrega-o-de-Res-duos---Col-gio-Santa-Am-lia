<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'
import { useEvaluationStore } from '../stores/evaluationStore'
// Se tiver rankingStore e quiser atualizar após limpar:
import { useRankingStore } from '../stores/rankingStore' 

import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'

const uiStore = useUiStore()
const evaluationStore = useEvaluationStore()
const rankingStore = useRankingStore()

async function handleClearDatabase() {
  uiStore.showConfirmModal({
    title: 'LIMPAR BANCO DE DADOS?',
    message: 'ATENÇÃO: AÇÃO IRREVERSÍVEL! Todos os registros de avaliação serão apagados permanentemente do servidor. Deseja realmente continuar?',
    okButtonText: 'Sim, APAGAR TUDO',
    // Usando classes utilitárias diretas caso 'bg-danger' não esteja configurado
    okButtonClass: 'bg-red-600 hover:bg-red-700 text-white border-red-700',

    onConfirm: async () => {
      try {
        const success = await evaluationStore.deleteAllEvaluations()
        
        if (success) {
          uiStore.showToast('Banco de dados limpo com sucesso!', 'success')
          // Tenta atualizar o ranking se possível
          try { await rankingStore.fetchResults(1, '') } catch {} 
          uiStore.closeModal()
        } else {
          throw new Error(evaluationStore.error || 'Falha ao limpar.')
        }
      } catch (error: any) {
        uiStore.showToast(error.message, 'error')
      }
    }
  })
}
</script>

<template>
  <BaseModal 
    :isOpen="uiStore.activeModal === 'admin'" 
    @close="uiStore.closeModal"
    class="w-full max-w-lg" 
    v-slot="{ titleId }"
  >

    <ModalHeader :titleId="titleId">
      <div class="flex items-center gap-3 text-red-600">
        <i class="fa-solid fa-user-shield text-xl"></i>
        <span class="font-bold text-lg">Área Administrativa</span>
      </div>
    </ModalHeader>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fa-solid fa-triangle-exclamation text-red-500"></i>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-bold text-red-800">Zona de Perigo</h3>
            <div class="mt-1 text-sm text-red-700">
              <p>As ações executadas aqui afetam diretamente o banco de dados em produção e não podem ser desfeitas.</p>
            </div>
          </div>
        </div>
      </div>

      <button 
        @click="handleClearDatabase"
        :disabled="evaluationStore.loading"
        class="w-full group relative flex items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-white font-bold shadow-md transition-all
               hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5
               focus:ring-4 focus:ring-red-500/30 active:translate-y-0
               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        <i v-if="evaluationStore.loading" class="fa-solid fa-circle-notch fa-spin"></i>
        <i v-else class="fa-solid fa-trash-can group-hover:scale-110 transition-transform"></i>
        
        <span>{{ evaluationStore.loading ? 'Processando...' : 'Limpar Todas as Avaliações' }}</span>
      </button>

      <div class="text-center">
         <button @click="uiStore.closeModal" class="text-sm text-gray-500 hover:text-gray-700 hover:underline">
           Cancelar e voltar
         </button>
      </div>

    </div>

  </BaseModal>
</template>