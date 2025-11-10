<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'
import { useEvaluationStore } from '../stores/evaluationStore'
import { useRankingStore } from '../stores/rankingStore'

import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'

const uiStore = useUiStore()
const evaluationStore = useEvaluationStore()
const rankingStore = useRankingStore()

async function handleClearDatabase() {
  uiStore.showConfirmModal({
    title: 'LIMPAR BANCO DE DADOS?',
    message: 'ATENÇÃO: AÇÃO IRREVERSÍVEL! Todos os registros de avaliação serão apagados permanentemente. Deseja continuar?',
    okButtonText: 'Sim, apagar tudo',
    okButtonClass: 'bg-danger hover:bg-danger/90 focus-ring:ring-danger/60',

    onConfirm: async () => {
      try {
        await evaluationStore.deleteAllEvaluations()
        uiStore.showToast('Banco de dados de avaliações limpo com sucesso!', 'success')
        await rankingStore.fetchResults(1, '')
        uiStore.closeModal()
      } catch (error: any) {
        uiStore.showToast(error.message, 'error')
      }
    }
  })
}
</script>

<template>
  <BaseModal class="max-w-lg" v-slot="{ titleId }">

    <ModalHeader :titleId="titleId">
      <i class="fa-solid fa-user-shield text-danger text-xl mr-3"></i>
      Ações de Administrador
    </ModalHeader>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <p class="text-sm leading-relaxed text-text-secondary">
        Atenção: As ações nesta seção são sensíveis e irreversíveis. Use com prudência.
      </p>

      <button 
        @click="handleClearDatabase"
        class="w-full rounded-lg bg-danger text-white font-semibold px-6 py-4 text-base shadow-lg transition-all
               hover:bg-danger/90 hover:shadow-xl
               focus-ring:ring-2 focus-ring:ring-danger/60 active:scale-[0.98]"
      >
        <i class="fa-solid fa-triangle-exclamation mr-2"></i>
        Limpar Banco de Dados de Avaliações
      </button>

    </div>

  </BaseModal>
</template>
