import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
// import { useAuthStore } from './authStore' // <-- *** CORREÇÃO: REMOVIDO DAQUI ***

// Tipos de dados
export interface EvaluationResult {
  id: string
  score: number
  date: string
  evaluator: string
  sectors: { name: string } | null
  deleted_at?: string | null
}

export const useRankingStore = defineStore('ranking', () => {
  // --- STATE ---
  const results = ref<EvaluationResult[]>([])
  const isLoading = ref(false)
  const filterText = ref('')
  const currentPage = ref(1)
  const totalPages = ref(1)
  const recordsPerPage = 10
  
  // --- ACTIONS ---

  async function fetchResults(page = 1, filter = '') {
    isLoading.value = true
    currentPage.value = page
    filterText.value = filter

    const from = (page - 1) * recordsPerPage
    const to = from + recordsPerPage - 1
    
    try {
      let data: EvaluationResult[] | null = null
      let error: any = null
      let count: number | null = null

      if (!filter) {
        // --- LÓGICA ANTIGA (Sem filtro) ---
        const { data: queryData, error: queryError, count: queryCount } = await supabaseClient
          .from('evaluations')
          .select('id, score, date, evaluator, deleted_at, sectors(*)', { count: 'exact' })
          .is('deleted_at', null)
          .order('score', { ascending: false })
          .range(from, to)
        
        data = queryData as unknown as EvaluationResult[]
        error = queryError
        count = queryCount

      } else {
        // --- LÓGICA NOVA (Com filtro) ---
        const { data: rpcData, error: rpcError } = await supabaseClient
          .rpc('search_evaluations', {
            search_term: filter,
            page_limit: recordsPerPage,
            page_offset: from
          })
        
        if (rpcError) throw rpcError
        
        data = rpcData.data
        error = rpcError
        count = rpcData.count
      }
      
      if (error) throw error
      
      results.value = data as unknown as EvaluationResult[]
      totalPages.value = Math.ceil((count || 0) / recordsPerPage) || 1

    } catch (error) {
      console.error("Erro ao carregar ranking:", error)
      results.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Restaura um item da lixeira.
   */
  async function restoreEvaluation(id: string) {
    // *** CORREÇÃO: Import dinâmico ***
    const { useAuthStore } = await import('./authStore')
    const authStore = useAuthStore()
    if (authStore.userRole !== 'admin') throw new Error('Apenas administradores podem restaurar.')
    console.log("Restaurando...", id)
  }

  /**
   * Carrega uma avaliação específica para edição.
   */
  async function fetchEvaluationForEdit(id: string) {
    // *** CORREÇÃO: Import dinâmico ***
    const { useAuthStore } = await import('./authStore')
    const authStore = useAuthStore()
    if (authStore.userRole !== 'admin') throw new Error('Apenas administradores podem editar.')
    console.log("Editando...", id)
  }

  return {
    results,
    isLoading,
    filterText,
    currentPage,
    totalPages,
    fetchResults,
    restoreEvaluation,
    fetchEvaluationForEdit,
  }
})