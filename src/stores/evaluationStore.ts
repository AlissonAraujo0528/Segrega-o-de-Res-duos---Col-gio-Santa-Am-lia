import { defineStore } from 'pinia';
import { ref } from 'vue';
import { evaluationService } from '../services/evaluationService';
import { useUiStore } from './uiStore';
import { useAuthStore } from './authStore';

export interface EvaluationPayload {
  sector_id: string;
  responsible: string;
  score: number;
  observations: string;
  image?: File | null;
}

export const useEvaluationStore = defineStore('evaluation', () => {
  const ui = useUiStore();
  const auth = useAuthStore();

  const loading = ref(false);
  
  // --- Estado para Edição (Reintroduzido para compatibilidade com Ranking) ---
  const editingId = ref<string | null>(null);
  const currentEvaluation = ref<any | null>(null);

  // --- Actions ---

  async function searchSectors(query: string) {
    try {
      return await evaluationService.searchSectors(query);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  // Correção do erro TS6133 (id não usado)
  async function getSectorById(id: string) {
    // Implementação básica para evitar o erro e preparar para futuro
    // Se quiser implementar real: return await evaluationService.getSectorById(id);
    if (id) return null; 
    return null;
  }

  // --- Ação de Carregar para Edição (Reintroduzida) ---
  async function loadEvaluationForEdit(id: string) {
    loading.value = true;
    try {
      const data = await evaluationService.getById(id);
      currentEvaluation.value = data;
      editingId.value = id;
    } catch (err: any) {
      ui.notify(err.message || 'Erro ao carregar avaliação.', 'error');
    } finally {
      loading.value = false;
    }
  }

  async function saveEvaluation(form: EvaluationPayload) {
    if (!auth.user) {
      ui.notify('Sessão expirada. Faça login novamente.', 'error');
      return false;
    }

    loading.value = true;
    try {
      // 1. Upload da imagem (se houver)
      let photoUrl = null;
      if (form.image) {
        photoUrl = await evaluationService.uploadPhoto(form.image, auth.user.id);
      }

      // 2. Montar objeto para o banco
      // Mantemos a foto antiga se estiver editando e não mandou nova
      const existingPhoto = editingId.value && currentEvaluation.value ? currentEvaluation.value.details?.photo_url : null;
      
      const payload = {
        user_id: auth.user.id,
        sector_id: form.sector_id,
        responsible: form.responsible,
        score: form.score,
        observations: form.observations, 
        date: new Date().toISOString().split('T')[0],
        evaluator: auth.user.email?.split('@')[0] || 'Avaliador',
        details: { 
            photo_url: photoUrl || existingPhoto 
        }
      };

      // 3. Salvar (Update se tiver ID, senão Create)
      if (editingId.value) {
        await evaluationService.update(editingId.value, payload);
        ui.notify('Avaliação atualizada com sucesso!', 'success');
      } else {
        await evaluationService.create({ ...payload, created_by: auth.user.id } as any);
        ui.notify('Avaliação registrada!', 'success');
      }
      
      resetState(); // Limpa o estado após salvar
      return true;

    } catch (err: any) {
      console.error(err);
      ui.notify(err.message || 'Erro ao salvar avaliação.', 'error');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteEvaluation(id: string) {
     try {
        await evaluationService.delete(id);
        return true;
     } catch (e) {
        throw e;
     }
  }
  
  async function resetAllData() {
    try {
        await evaluationService.deleteAll();
        return true;
    } catch (e) {
        throw e;
    }
  }

  function resetState() {
    editingId.value = null;
    currentEvaluation.value = null;
  }

  return {
    loading,
    editingId,
    currentEvaluation,
    searchSectors,
    getSectorById,
    loadEvaluationForEdit, // Agora existe!
    saveEvaluation,
    deleteEvaluation,
    resetAllData,
    resetState // Agora existe!
  };
});