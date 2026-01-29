import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dashboardService, type DashboardData } from '../services/dashboardService';
import { useUiStore } from './uiStore';

export const useDashboardStore = defineStore('dashboard', () => {
  const ui = useUiStore();
  
  // --- State (Reativo) ---
  const loading = ref(false);
  const data = ref<DashboardData>(dashboardService.getEmptyState());
  
  // Controle de Mês/Ano (Futuro: Pode ser movido para o Service se a lógica crescer)
  const selectedPeriod = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // --- Actions ---

  /**
   * Carrega os dados do dashboard e atualiza o estado
   */
  async function loadDashboard() {
    loading.value = true;
    try {
      // Chama o serviço inteligente
      // Nota: O serviço atual já busca os últimos 6 meses automaticamente.
      // Se quiser filtrar por mês específico, teríamos que adaptar o serviço.
      // Por enquanto, vamos manter a visão "Geral dos últimos 6 meses" que é mais rica.
      const metrics = await dashboardService.getDashboardMetrics();
      
      data.value = metrics;
    } catch (err: any) {
      console.error(err);
      ui.notify(err.message || 'Erro ao carregar dashboard.', 'error');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Força uma atualização dos dados (ex: após salvar uma nova avaliação)
   */
  async function refresh() {
    await loadDashboard();
  }

  return {
    // State
    loading,
    data,
    selectedPeriod,

    // Actions
    loadDashboard,
    refresh
  };
});