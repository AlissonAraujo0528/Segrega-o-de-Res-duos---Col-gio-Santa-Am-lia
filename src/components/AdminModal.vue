<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../stores/uiStore';
import { useEvaluationStore } from '../stores/evaluationStore';
import { useRankingStore } from '../stores/rankingStore';

// Componentes UI
import AppModal from './ui/AppModal.vue';
import AppButton from './ui/AppButton.vue';

const ui = useUiStore();
const evaluationStore = useEvaluationStore();
const rankingStore = useRankingStore();

const loading = ref(false);

function handleClose() {
  ui.modals.admin = false;
}

async function handleResetDatabase() {
  // Usa o novo sistema de confirmação da uiStore
  ui.confirm({
    title: 'Apagar TUDO?',
    message: 'Tem certeza absoluta? Isso apagará todas as avaliações do banco de dados. Esta ação é irreversível.',
    okButtonText: 'Sim, Apagar Tudo',
    isDangerous: true, // Estiliza o botão de vermelho automaticamente
    onConfirm: async () => {
      loading.value = true;
      try {
        // Chama a action da store que usa o Service por baixo
        const success = await evaluationStore.resetAllData();
        
        if (success) {
          // Limpa a lista local do ranking para refletir a mudança imediatamente
          rankingStore.results = []; 
          ui.notify('Banco de dados resetado com sucesso.', 'success');
          handleClose();
        }
      } finally {
        loading.value = false;
      }
    }
  });
}
</script>

<template>
  <AppModal :isOpen="ui.modals.admin" title="Administração do Sistema" @close="handleClose">
    <div class="space-y-6">
      
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <h4 class="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
          <i class="fa-solid fa-info-circle"></i> Status do Sistema
        </h4>
        <p class="text-sm text-blue-700 dark:text-blue-400">
          Você está logado como Administrador. Utilize as funções abaixo com cautela.
        </p>
      </div>

      <div class="space-y-3">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Ações de Banco de Dados</h4>
        
        <div class="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span class="font-bold text-red-700 dark:text-red-400 block">Resetar Avaliações</span>
            <span class="text-xs text-red-600/80 dark:text-red-400/70">Apaga todos os registros de auditoria 5S.</span>
          </div>
          
          <AppButton 
            @click="handleResetDatabase"
            :loading="loading"
            variant="danger"
            icon="fa-solid fa-trash-can"
          >
            Limpar Tudo
          </AppButton>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 dark:border-gray-700 text-center text-xs text-gray-400">
        Versão do Sistema: 2.0.0 (Enterprise)
      </div>

    </div>
  </AppModal>
</template>