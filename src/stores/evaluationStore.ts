import { defineStore } from 'pinia';
import { ref } from 'vue';
import { evaluationService } from '../services/evaluationService';
import { useUiStore } from './uiStore';

// Interface do Estado da Avaliação (Front-end)
export interface EvaluationState {
  id?: string | null;
  sector_id: string;
  responsible: string;
  // Mapeia os sensos: { seiri: 5, seiton: 3 ... }
  scores: Record<string, number>; 
  observations: string;
  photo_url: string | null;
}

export const useEvaluationStore = defineStore('evaluation', () => {
  // --- Dependências ---
  const ui = useUiStore();

  // --- State (Reativo) ---
  const loading = ref(false);
  const editingId = ref<string | null>(null);
  
  // Estado inicializado para suportar o v-model do Wizard sem erros
  const currentEvaluation = ref<EvaluationState>({
    sector_id: '',
    responsible: '',
    scores: {},
    observations: '',
    photo_url: null
  });

  // --- Actions ---

  /**
   * Reseta o formulário para o estado inicial
   */
  function resetState() {
    editingId.value = null;
    currentEvaluation.value = {
      sector_id: '',
      responsible: '',
      scores: {},
      observations: '',
      photo_url: null
    };
    loading.value = false;
  }

  /**
   * Busca setores (Proxy para o service)
   */
  async function searchSectors(query: string) {
    try {
      return await evaluationService.searchSectors(query);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * Carrega dados para edição
   */
  async function loadEvaluationForEdit(id: string) {
    loading.value = true;
    try {
      const data = await evaluationService.getById(id);
      
      // Mapeia do banco para o estado local
      currentEvaluation.value = {
        id: data.id,
        sector_id: data.sector_id,
        responsible: data.responsible,
        // Se o banco não tiver scores detalhados, assume vazio ou lógica customizada
        scores: {}, 
        observations: data.observations,
        photo_url: data.photo_url // URL vinda do service (details ou coluna)
      };
      
      // Se você salvou os scores individuais no JSONB 'details', recupere aqui:
      if (data.details && (data.details as any).scores) {
         currentEvaluation.value.scores = (data.details as any).scores;
      }

      editingId.value = id;
    } catch (err: any) {
      ui.notify(err.message || 'Erro ao carregar.', 'error');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Upload de Evidência (Passo 3 do Wizard)
   */
  async function uploadEvidence(file: File, userId: string) {
    loading.value = true;
    try {
      const url = await evaluationService.uploadPhoto(file, userId);
      currentEvaluation.value.photo_url = url;
      ui.notify('Foto enviada com sucesso.', 'success');
    } catch (err: any) {
      ui.notify('Erro no upload da foto.', 'error');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Enviar Avaliação Final (Create ou Update)
   */
  async function submitEvaluation(userId: string) {
    loading.value = true;
    try {
      // 1. Calcular Nota Total
      const totalScore = Object.values(currentEvaluation.value.scores).reduce((a, b) => a + b, 0);

      // 2. Montar Payload para o Supabase
      const payload = {
        sector_id: currentEvaluation.value.sector_id,
        responsible: currentEvaluation.value.responsible,
        score: totalScore,
        observations: currentEvaluation.value.observations,
        date: new Date().toISOString().split('T')[0], // Hoje YYYY-MM-DD
        evaluator: 'Usuário ' + userId.slice(0, 4), // Simplificado
        // Salvamos URL da foto e os scores individuais no JSONB 'details'
        details: {
          photo_url: currentEvaluation.value.photo_url,
          scores: currentEvaluation.value.scores
        }
      };

      // 3. Enviar
      if (editingId.value) {
        await evaluationService.update(editingId.value, payload);
      } else {
        await evaluationService.create({ ...payload, user_id: userId } as any);
      }

      return true;

    } catch (err: any) {
      ui.notify(err.message || 'Erro ao salvar avaliação.', 'error');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Remover Avaliação
   */
  async function removeEvaluation(id: string) {
    loading.value = true;
    try {
      await evaluationService.delete(id);
      return true;
    } catch (err: any) {
      ui.notify(err.message || 'Erro ao excluir.', 'error');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Resetar Banco de Dados (Admin)
   */
  async function resetAllData() {
    loading.value = true;
    try {
      await evaluationService.deleteAll();
      return true;
    } catch (err: any) {
      ui.notify(err.message || 'Erro ao limpar dados.', 'error');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    loading,
    editingId,
    currentEvaluation,
    
    // Actions
    resetState,
    searchSectors,
    loadEvaluationForEdit,
    uploadEvidence,
    submitEvaluation,
    removeEvaluation,
    resetAllData
  };
});