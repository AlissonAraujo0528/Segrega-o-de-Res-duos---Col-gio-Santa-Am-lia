import { defineStore } from 'pinia';
import { ref } from 'vue';
import { evaluationService } from '../services/evaluationService'; 
import { useAuthStore } from './authStore'; 
import { useNotificationStore } from './uiStore';

// Tipos para o Frontend
export interface EvaluationForm {
  sector_id: string;
  responsible: string;
  score: number;
  weight: number;
  observations?: string;
  image?: File | null;
}

export const useEvaluationStore = defineStore('evaluation', () => {
  // --- Dependências ---
  const auth = useAuthStore();
  const notify = useNotificationStore(); // Sua store de notificações

  // --- State (Reativo) ---
  const loading = ref(false);
  const editingId = ref<string | null>(null);
  
  // Estado do formulário (para preencher na edição)
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

  async function loadEvaluationForEdit(id: string) {
    loading.value = true;
    try {
      const data = await evaluationService.getById(id);
      
      // Prepara o objeto para o formulário
      currentEvaluation.value = {
        id: data.id,
        sector_id: data.sector_id,
        responsible: data.responsible,
        score: data.score,
        observations: data.observations,
        photo_url: data.photo_url, // URL da foto existente
        // weight não costuma vir do banco se for calculado, ajuste conforme necessário
      };
      editingId.value = id;
    } catch (err: any) {
      notify.add({ type: 'error', message: err.message });
    } finally {
      loading.value = false;
    }
  }

  async function saveEvaluation(form: EvaluationForm) {
    if (!auth.user) {
      notify.add({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
      return false;
    }

    loading.value = true;
    try {
      // 1. Upload da imagem (se houver)
      let uploadedUrl = null;
      if (form.image) {
        uploadedUrl = await evaluationService.uploadPhoto(form.image, auth.user.id);
      }

      // 2. Montar objeto para o banco
      // Se não fez upload novo, usa a URL antiga (em caso de edição)
      const finalPhotoUrl = uploadedUrl || (editingId.value ? currentEvaluation.value?.photo_url : null);

      const payload = {
        user_id: auth.user.id,
        sector_id: form.sector_id,
        responsible: form.responsible,
        score: form.score,
        observations: form.observations,
        date: new Date().toISOString().split('T')[0],
        evaluator: auth.user.email?.split('@')[0] || 'Avaliador',
        details: finalPhotoUrl ? { photo_url: finalPhotoUrl } : null, // JSONB structure
      };

      // 3. Salvar (Update ou Create)
      if (editingId.value) {
        await evaluationService.update(editingId.value, payload);
        notify.add({ type: 'success', message: 'Avaliação atualizada com sucesso!' });
      } else {
        // created_by só no insert se sua tabela tiver essa coluna
        await evaluationService.create({ ...payload, created_by: auth.user.id } as any);
        notify.add({ type: 'success', message: 'Avaliação registrada!' });
      }

      resetState();
      return true;

    } catch (err: any) {
      notify.add({ type: 'error', message: err.message || 'Erro ao salvar.' });
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function removeEvaluation(id: string) {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    
    loading.value = true;
    try {
      await evaluationService.delete(id);
      notify.add({ type: 'success', message: 'Item excluído.' });
      return true;
    } catch (err: any) {
      notify.add({ type: 'error', message: 'Erro ao excluir.' });
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function resetAllData() {
    if (!confirm('ATENÇÃO: Isso apagará TODOS os dados. Continuar?')) return;

    loading.value = true;
    try {
      await evaluationService.deleteAll();
      notify.add({ type: 'success', message: 'Banco de dados limpo.' });
      return true;
    } catch (err: any) {
      notify.add({ type: 'error', message: err.message });
      return false;
    } finally {
      loading.value = false;
    }
  }

  function resetState() {
    editingId.value = null;
    currentEvaluation.value = null;
    loading.value = false;
  }

  return {
    loading,
    editingId,
    currentEvaluation,
    searchSectors,
    loadEvaluationForEdit,
    saveEvaluation,
    removeEvaluation,
    resetAllData,
    resetState
  };
});