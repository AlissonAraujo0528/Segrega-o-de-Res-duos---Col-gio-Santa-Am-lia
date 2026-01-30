import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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
    // Se estiver na página 1 e sem filtro, remove os top 3 da lista para não duplicar
    if (currentPage.value === 1 && !filterText.value) {
      return results.value.slice(3); 
    }
    return results.value;
  });

  // --- Actions ---

  /**
   * Busca os resultados com Timeout de segurança para Mobile
   */
  async function fetchResults(page = 1, search = '') {
    loading.value = true;
    currentPage.value = page;
    filterText.value = search;

    // 1. Cria um timer de 10 segundos que rejeita a promessa
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('A conexão demorou muito. Verifique sua internet.')), 10000)
    );

    try {
      // 2. Promise.race: Coloca a requisição do banco para "correr" contra o timer
      // O que terminar primeiro define o resultado.
      const result: any = await Promise.race([
        rankingService.getRankings(page, itemsPerPage, search),
        timeout
      ]);

      // Se chegou aqui, a requisição ganhou do timer
      results.value = result.data;
      totalItems.value = result.count;

    } catch (err: any) {
      console.error(err);
      ui.notify(err.message || 'Erro ao carregar ranking.', 'error');
      results.value = []; // Limpa dados visuais em caso de erro
    } finally {
      loading.value = false; // Garante que o spinner vai sumir
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
      await evaluationStore.loadEvaluationForEdit(id);
      
      // O redirecionamento de aba é feito na View, aqui só garantimos o load
      if (!evaluationStore.currentEvaluation) {
        throw new Error('Falha ao carregar dados.');
      }
    } catch (error) {
      ui.notify('Não foi possível carregar a edição.', 'error');
    }
  }

  /**
   * Exporta TODOS os dados para Excel
   */
  async function exportAllResults() {
    loading.value = true;
    try {
      const rawData = await rankingService.getAllForExport();

      if (!rawData || rawData.length === 0) {
        ui.notify('Não há dados para exportar.', 'warning');
        return;
      }

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
    results,
    loading,
    filterText,
    currentPage,
    totalItems,
    totalPages,
    top3,
    listItems,
    fetchResults,
    openEditModal,
    exportAllResults
  };
});