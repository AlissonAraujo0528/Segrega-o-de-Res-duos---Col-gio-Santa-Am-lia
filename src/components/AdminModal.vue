<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'
import { useEvaluationStore } from '../stores/evaluationStore'
import { useRankingStore } from '../stores/rankingStore' 
import AppButton from './ui/AppButton.vue'

const uiStore = useUiStore()
const evaluationStore = useEvaluationStore()
const rankingStore = useRankingStore()

// Fecha o modal usando a store atualizada
function close() {
  uiStore.closeModal()
}

async function handleClearDatabase() {
  uiStore.showConfirmModal({
    title: 'LIMPAR BANCO DE DADOS?',
    message: 'ATENÇÃO: AÇÃO IRREVERSÍVEL! Todos os registros de avaliação serão apagados permanentemente. Deseja realmente continuar?',
    okButtonText: 'Sim, APAGAR TUDO',
    okButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
    onConfirm: async () => {
      try {
        const success = await evaluationStore.deleteAllEvaluations()
        
        if (success) {
          uiStore.showToast('Banco de dados limpo com sucesso!', 'success')
          // Tenta atualizar o ranking para limpar a visualização
          try { await rankingStore.fetchResults(1, '') } catch {} 
          close()
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" @click.self="close">
    
    <div class="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">

      <div class="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3 text-red-600 dark:text-red-500">
           <div class="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
             <i class="fa-solid fa-user-shield text-xl"></i>
           </div>
           <span class="font-bold text-lg text-gray-800 dark:text-white">Área Administrativa</span>
        </div>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <i class="fa-solid fa-times text-xl"></i>
        </button>
      </div>

      <div class="p-6 space-y-6">

        <div class="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <i class="fa-solid fa-triangle-exclamation text-red-500 mt-0.5"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-bold text-red-800 dark:text-red-400">Zona de Perigo</h3>
              <div class="mt-1 text-sm text-red-700 dark:text-red-300">
                <p>As ações executadas aqui afetam diretamente o banco de dados em produção e <strong>não podem ser desfeitas</strong>.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Ações Disponíveis:</p>
          
          <AppButton 
            @click="handleClearDatabase"
            :disabled="evaluationStore.loading"
            :loading="evaluationStore.loading"
            variant="danger"
            class="w-full py-4 text-base shadow-lg shadow-red-500/20"
            icon="fa-solid fa-trash-can"
          >
            Limpar Todas as Avaliações
          </AppButton>
        </div>

      </div>

      <div class="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 text-center">
        <button @click="close" class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors hover:underline">
          Cancelar e voltar ao painel
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>