import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'

// --- Tipos ---
interface KpiData {
  average_score: number
  success_rate: number
  total_sectors_evaluated: number
}

interface MedalData {
  gold: string[]
  silver: string[]
  bronze: string[]
}

// NOVO: Define o tipo para os nossos novos períodos
interface Period {
  id: string // ex: "2025-11"
  label: string // ex: "11/2025"
}

export const useDashboardStore = defineStore('dashboard', () => {
  // --- STATE ---
  const isLoading = ref(false)
  const kpis = ref<KpiData | null>(null)
  const medalLists = ref<MedalData | null>(null)
  const worstSectors = ref<any[] | null>(null) 
  const worstItems = ref<any | null>(null)
  
  const availablePeriods = ref<Period[]>([]) // NOVO: Armazena a lista de períodos

  // --- ACTIONS ---

  /**
   * NOVO: Busca a lista de períodos válidos.
   */
  async function fetchAvailablePeriods() {
    if (availablePeriods.value.length > 0) return // Já carregado

    try {
      // Chama a nova RPC que criamos
      const { data, error } = await supabaseClient.rpc('get_available_periods')
      if (error) throw error
      availablePeriods.value = data
    } catch (error) {
      console.error("Erro ao buscar períodos:", error)
    }
  }

  /**
   * Busca os dados do dashboard (esta função está correta)
   */
  async function fetchDashboardData(month: number, year: number) {
    isLoading.value = true
    kpis.value = null
    medalLists.value = null
    worstSectors.value = null
    worstItems.value = null

    try {
      const { data, error } = await supabaseClient.rpc('get_dashboard_data_v3', {
        p_mes: month,
        p_ano: year
      })

      if (error) throw error
      if (!data) throw new Error("Não há dados para este período.")

      kpis.value = data.kpis
      medalLists.value = data.medal_lists
      worstSectors.value = data.worst_5_sectors
      worstItems.value = data.worst_items

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    kpis,
    medalLists,
    worstSectors,
    worstItems,
    availablePeriods,
    fetchAvailablePeriods,
    fetchDashboardData,
  }
})