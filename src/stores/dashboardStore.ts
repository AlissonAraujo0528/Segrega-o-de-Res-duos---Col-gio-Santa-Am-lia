import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabaseClient } from '../lib/supabaseClient';

export const useDashboardStore = defineStore('dashboard', () => {
  
  // --- State ---
  const loading = ref(false);
  const data = ref<any>(null); // Armazena o JSON completo retornado pelo RPC

  // Filtros de Data (Inicializa com o mês atual)
  const currentMonth = ref(new Date().getMonth() + 1); // 1 a 12
  const currentYear = ref(new Date().getFullYear());

  // --- Actions ---

  /**
   * Busca os dados avançados do banco usando a função RPC
   */
  async function fetchDashboardData() {
    loading.value = true;
    
    try {
      // Chama a função SQL que criamos ('get_advanced_dashboard')
      const { data: result, error } = await supabaseClient.rpc('get_advanced_dashboard', {
        p_mes: currentMonth.value,
        p_ano: currentYear.value
      });

      if (error) throw error;

      // O resultado já vem pronto no formato JSON esperado pelo Vue
      data.value = result;
      
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
      // Se quiser, pode injetar a uiStore aqui para notificar erro
    } finally {
      loading.value = false;
    }
  }

  /**
   * Atualiza os filtros e recarrega os dados
   */
  function setFilter(month: number, year: number) {
    currentMonth.value = month;
    currentYear.value = year;
    fetchDashboardData();
  }

  /**
   * Recarrega os dados mantendo os filtros atuais
   */
  function refresh() {
    fetchDashboardData();
  }

  return {
    // State
    loading,
    data,
    currentMonth,
    currentYear,

    // Actions
    fetchDashboardData,
    setFilter,
    refresh
  };
});