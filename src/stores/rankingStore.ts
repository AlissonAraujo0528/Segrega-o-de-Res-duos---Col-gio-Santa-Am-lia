import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import { exportToExcel } from '../lib/exportToExcel'
import { useUiStore } from './uiStore'
import { useEvaluationStore } from './evaluationStore'
import { useAuthStore } from './authStore'

export interface EvaluationResult {
  id: string
  score: number
  date: string
  evaluator: string
  // Mapeamento do Supabase (pode vir como objeto, array ou null)
  sectors: any 
  sector?: string | null // Legado
  
  // Propriedades processadas para o Front
  setor_nome: string 
  data_formatada: string
  deleted_at?: string | null
}

// Interface para exportação
interface EvaluationExport {
  id: string
  score: number
  date: string | null
  evaluator: string
  sector?: string | null
  // CORREÇÃO: Aceita any para lidar com Array ou Objeto vindo do Supabase
  sectors: any 
  responsible: string | null
  observations: string | null
}

export const useRankingStore = defineStore('ranking', () => {
  
  // --- STATE ---
  const results = ref<EvaluationResult[]>([])
  const isLoading = ref(false)
  
  // Paginação e Filtros
  const filterText = ref('')
  const currentPage = ref(1)
  const totalPages = ref(1)
  const recordsPerPage = 10

  // Stores
  const uiStore = useUiStore()
  const evaluationStore = useEvaluationStore()
  const authStore = useAuthStore()

  // --- ACTIONS ---

  async function fetchResults(page = 1, filter = '') {
    isLoading.value = true
    currentPage.value = page
    filterText.value = filter

    const from = (page - 1) * recordsPerPage
    
    try {
      let data: any[] | null = null
      let error: any = null
      let count: number | null = null

      if (!filter) {
        // --- BUSCA PADRÃO (Sem filtro) ---
        const to = from + recordsPerPage - 1
        const query = supabaseClient
          .from('evaluations')
          .select(`
            id, 
            score, 
            date, 
            evaluator, 
            deleted_at,
            sector,  
            sectors ( name )
          `, { count: 'exact' })
          .is('deleted_at', null)
          .order('date', { ascending: false }) // CORREÇÃO: Ordenar por Data (mais recente)
          .range(from, to)
        
        const response = await query
        data = response.data
        error = response.error
        count = response.count

      } else {
        // --- BUSCA COM FILTRO (Via RPC) ---
        const { data: rpcResponse, error: rpcError } = await supabaseClient.rpc(
          'search_evaluations',
          {
            search_term: filter,
            page_limit: recordsPerPage,
            page_offset: from,
          }
        )

        if (rpcError) throw rpcError

        data = rpcResponse.data
        error = null
        count = rpcResponse.count
      }

      if (error) throw error

      // Processamento e Normalização dos Dados
      if (data) {
        results.value = data.map((item: any) => {
          // Resolve nome do setor (Relação -> Legado -> Fallback)
          // Lida com caso de ser array ou objeto
          const sectorData = item.sectors
          let relationName = ''
          
          if (Array.isArray(sectorData) && sectorData.length > 0) {
             relationName = sectorData[0].name
          } else if (sectorData && typeof sectorData === 'object') {
             relationName = sectorData.name
          }

          const nomeResolvido = relationName || item.sector || 'Setor Desconhecido'

          return {
            ...item,
            setor_nome: nomeResolvido,
            // Formata data considerando UTC para não perder o dia
            data_formatada: item.date 
              ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
              : '-'
          }
        })
      } else {
        results.value = []
      }

      totalPages.value = Math.ceil((count || 0) / recordsPerPage) || 1

    } catch (error) {
      console.error('Erro ao carregar ranking:', error)
      uiStore.showToast('Erro ao carregar dados do ranking.', 'error')
      results.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Prepara e abre o modal de edição
   */
  async function openEditModal(id: string) {
    // 1. Verificação de Permissão
    if (authStore.userRole !== 'admin') {
      uiStore.showToast('Apenas administradores podem editar registros.', 'error')
      return
    }

    try {
      // 2. Carrega os dados na store de avaliação
      await evaluationStore.fetchEvaluationForEdit(id)
      
      if (evaluationStore.dataToEdit) {
        // 3. ABRE o modal de avaliação
        uiStore.openEvaluationModal()
      } else {
        throw new Error('Avaliação não encontrada.')
      }
    } catch (error: any) {
      console.error('Erro ao preparar edição:', error)
      uiStore.showToast(error.message || 'Erro ao abrir edição.', 'error')
    }
  }

  /**
   * Restaura um registro deletado logicamente (soft delete)
   */
  async function restoreEvaluation(id: string) {
    if (authStore.userRole !== 'admin') {
      uiStore.showToast('Apenas administradores podem restaurar.', 'error')
      return
    }

    try {
      const { error } = await supabaseClient
        .from('evaluations')
        .update({ deleted_at: null })
        .eq('id', id)

      if (error) throw error

      uiStore.showToast('Registro restaurado com sucesso!', 'success')
      await fetchResults(currentPage.value, filterText.value)
    } catch (error: any) {
      console.error('Erro ao restaurar:', error)
      uiStore.showToast('Falha ao restaurar registro.', 'error')
    }
  }

  // --- EXPORTAÇÃO ---

  async function fetchAllResultsForExport(): Promise<EvaluationExport[]> {
    // Usa a RPC para buscar tudo sem paginação (limite alto)
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'search_evaluations',
      { search_term: '', page_limit: 5000, page_offset: 0 },
    )

    if (rpcError) throw rpcError
    
    // CORREÇÃO DO ERRO TS2322: Casting explícito
    return (rpcData?.data || []) as unknown as EvaluationExport[]
  }

  function formatDateForId(dateStr: string | null | undefined): string {
    if (!dateStr) return '00000000'
    const parts = dateStr.split('T')
    return parts[0] ? parts[0].replace(/-/g, '') : '00000000'
  }

  function padId(id: string): string {
    if (!id) return '000000'
    return id.slice(-6).toUpperCase()
  }

  async function exportAllResults() {
    isLoading.value = true
    try {
      const data = await fetchAllResultsForExport()
      
      if (!data || data.length === 0) {
        throw new Error('Não há dados para exportar.')
      }

      // Mapeia para o formato "Legível" do Excel
      const formattedData = data.map((item) => {
        // Lógica robusta para extrair nome do setor (Array ou Objeto)
        let relationName = ''
        if (Array.isArray(item.sectors) && item.sectors.length > 0) {
             relationName = item.sectors[0].name
        } else if (item.sectors && typeof item.sectors === 'object') {
             relationName = (item.sectors as any).name
        }

        const setor = relationName || item.sector || 'Desconhecido'

        return {
          'Ref': `${formatDateForId(item.date)}-${padId(item.id)}`,
          'Data': item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
          'Setor': setor, 
          'Nota': item.score,
          'Avaliador': item.evaluator,
          'Responsável': item.responsible ?? '',
          'Observações': item.observations ?? '',
        }
      })

      const timestamp = new Date().toISOString().split('T')[0]
      exportToExcel(formattedData, `Klin_Ranking_5S_${timestamp}`)
      
      uiStore.showToast('Download iniciado!', 'success')
    } catch (error: any) {
      console.error(error)
      uiStore.showToast(error.message || 'Erro na exportação.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  return {
    results,
    isLoading,
    filterText,
    currentPage,
    totalPages,
    
    fetchResults,
    openEditModal,
    restoreEvaluation,
    exportAllResults,
  }
})