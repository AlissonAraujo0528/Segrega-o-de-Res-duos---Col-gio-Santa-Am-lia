import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
// import { useAuthStore } from './authStore' // <-- *** CORREÇÃO: REMOVIDO DAQUI ***

// Tipos de dados
interface Sector {
  id: string
  name: string
  default_responsible: string
}

export interface EvaluationFull {
  id: string
  date: string
  evaluator: string
  sector_id: string
  score: number
  details: { [key: string]: string | number } | null // Corrigido para aceitar null
  responsible: string
  observations: string
}

export interface EvaluationData {
  date: string
  evaluator: string
  sector_id: string
  score: number
  details: { [key: string]: string | number }
  responsible: string
  observations: string
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-evaluation`

export const useEvaluationStore = defineStore('evaluation', () => {
  // --- STATE ---
  const sectorsList = ref<Sector[]>([])
  const isLoadingSectors = ref(false)
  const editingEvaluationId = ref<string | null>(null)
  const dataToEdit = ref<EvaluationFull | null>(null)

  // --- ACTIONS ---
  async function loadSectors() {
    if (sectorsList.value.length > 0) return
    isLoadingSectors.value = true
    try {
      const { data, error } = await supabaseClient
        .from('sectors')
        .select('id, name, default_responsible')

      if (error) throw error
      data.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true })
      })
      sectorsList.value = data
    } catch (error) {
      console.error('Erro ao carregar setores:', error)
    } finally {
      isLoadingSectors.value = false
    }
  }

  // NOVO: Busca setores com base em um texto (para o combobox)
  async function searchSectors(query: string): Promise<Sector[]> {
    try {
      const { data, error } = await supabaseClient
        .from('sectors')
        .select('id, name, default_responsible')
        .ilike('name', `%${query}%`) // Busca com "ilike" (case-insensitive)
        .limit(10) // Limita a 10 resultados

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar setores:', error)
      return []
    }
  }
  
  // NOVO: Busca um único setor pelo ID (para o modo de edição)
  async function getSectorById(id: string): Promise<Sector | null> {
    try {
      const { data, error } = await supabaseClient
        .from('sectors')
        .select('id, name, default_responsible')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar setor por ID:', error)
      return null
    }
  }

  async function fetchEvaluationForEdit(id: string) {
    try {
      const { data, error } = await supabaseClient
        .from('evaluations')
        .select('id, date, evaluator, sector_id, score, details, responsible, observations')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      dataToEdit.value = data as EvaluationFull
      editingEvaluationId.value = id
      
    } catch (error) {
      console.error("Erro ao carregar avaliação para edição:", error)
      clearEditMode()
    }
  }

  function clearEditMode() {
    editingEvaluationId.value = null
    dataToEdit.value = null
  }

  async function submitEvaluation(
    evaluationData: EvaluationData,
  ) {
    // *** CORREÇÃO: Import dinâmico ***
    const { useAuthStore } = await import('./authStore')
    const authStore = useAuthStore()
    
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
    if (sessionError || !session) {
      authStore.handleLogout()
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const isUpdate = !!editingEvaluationId.value
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        evaluationData: evaluationData,
        isUpdate: isUpdate,
        evaluationId: editingEvaluationId.value
      })
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Erro desconhecido.')

    clearEditMode()
    return result
  }

  async function deleteEvaluation(id: string) {
    try {
      const { error } = await supabaseClient
        .from('evaluations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) throw error
      
    } catch (error) {
      console.error('Erro ao mover para lixeira:', error)
      throw new Error('Não foi possível excluir o registro.')
    }
  }

  async function deleteAllEvaluations() {
  // A RPC no Supabase já tem a verificação de 'admin',
  // então esta chamada falhará com segurança se um não-admin tentar.
  try {
    const { error } = await supabaseClient.rpc('delete_all_evaluations')
    if (error) throw error
  } catch (error: any) {
    console.error('Erro ao limpar avaliações:', error)
    // Retorna a mensagem de erro da RPC (ex: "Acesso negado")
    throw new Error(error.message || 'Falha ao executar a ação de admin.')
  }
}

  return {
    sectorsList,
    isLoadingSectors,
    editingEvaluationId,
    dataToEdit,
    loadSectors,
    fetchEvaluationForEdit,
    clearEditMode,
    submitEvaluation,
    deleteEvaluation,
    searchSectors,
    getSectorById,
    deleteAllEvaluations,
  }
})