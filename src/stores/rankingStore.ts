import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// CORREÇÃO: Importamos 'type RankingItem' do Service para garantir compatibilidade total
import { rankingService, type RankingItem } from '../services/rankingService';
import { exportToExcel } from '../lib/exportToExcel';
import { useUiStore } from './uiStore';
import { useEvaluationStore } from './evaluationStore';
import { useAuthStore } from './authStore';

export const useRankingStore = defineStore('ranking', () => {
  // --- Dependências ---
  const ui = useUiStore();
  const auth = useAuthStore();
  const evaluationStore = useEvaluationStore();

  // --- State ---
  // O TypeScript agora sabe que este RankingItem é o mesmo que o Service retorna
  const results = ref<RankingItem[]>([]);
  const loading = ref(false);
  
  // Paginação
  const currentPage = ref(1);
  const totalItems = ref(0);
  const itemsPerPage = 10;
  
  // Filtro
  const filterText = ref('');

  // --- Getters ---
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage) || 1);

  // Separa os top 3 apenas se estivermos na página 1 e sem filtro (para o Pódio)
  const top3 = computed(() => {
    if (currentPage.value === 1 && !filterText.value) {
      return results.value.slice(0, 3);
    }
    return [];
  });

  const listItems = computed(() => {
    // Se estiver na página 1 e sem filtro, remove os top 3 da lista para não duplicar com o pódio
    if (currentPage.value === 1 && !filterText.value) {
      return results.value.slice(3); 
    }
    return results.value;
  });

  // --- Actions ---

  /**
   * Busca os resultados paginados e filtrados via Serviço
   */
  async function fetchResults(page = 1, search = '') {
    loading.value = true;
    currentPage.value = page;
    filterText.value = search;

    try {
      const { data, count } = await rankingService.getRankings(page, itemsPerPage, search);
      results.value = data;
      totalItems.value = count;
    } catch (err: any) {
      console.error(err);
      ui.notify(err.message || 'Erro ao carregar ranking.', 'error');
      results.value = []; // Limpa em caso de erro
    } finally {
      loading.value = false;
    }
  }

  /**
   * Abre o modal de edição (Requer permissão de Admin)
   */
  async function openEditModal(id: string) {
    if (auth.userRole !== 'admin') {
      ui.notify('Apenas administradores podem editar.', 'warning');
      return;
    }

    try {
      // Usa a store de avaliação para carregar os dados
      await evaluationStore.loadEvaluationForEdit(id);
      
      // Se carregou com sucesso, abre o modal
      if (evaluationStore.currentEvaluation) {
        ui.openEvaluation(); 
      }
    } catch (error) {
      // O erro já é tratado no evaluationStore, mas garantimos aqui
      ui.notify('Não foi possível abrir a edição.', 'error');
    }
  }

  /**
   * Exporta TODOS os dados para Excel (ExcelJS)
   */
  async function exportAllResults() {
    loading.value = true;
    try {
      // 1. Busca dados brutos do serviço
      const rawData = await rankingService.getAllForExport();

      if (!rawData || rawData.length === 0) {
        ui.notify('Não há dados para exportar.', 'warning');
        return;
      }

      // 2. Chama o utilitário de exportação inteligente
      await exportToExcel(rawData, {
        fileName: 'Relatorio_Auditorias_5S',
        sheetName: 'Ranking Geral',
        columns: [
          { header: 'Data', key: 'data', width: 15 },
          { header: 'Setor', key: 'setor', width: 30 },
          { header: 'Responsável', key: 'responsavel', width: 25 },
          { header: 'Nota', key: 'nota', width: 10 },
          { header: 'Avaliador', key: 'avaliador', width: 20 },
          { header: 'Observações', key: 'obs', width: 50 },
        ]
      });

      ui.notify('Relatório gerado com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      ui.notify(error.message || 'Erro ao gerar Excel.', 'error');
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    results,
    loading,
    filterText,
    currentPage,
    totalItems,
    
    // Getters
    totalPages,
    top3,
    listItems,

    // Actions
    fetchResults,
    openEditModal,
    exportAllResults
  };
});