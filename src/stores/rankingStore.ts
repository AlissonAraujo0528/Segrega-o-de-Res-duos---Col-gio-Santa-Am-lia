import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import { exportToExcel } from '../lib/exportToExcel'
import { useUiStore } from './uiStore'
import { useEvaluationStore } from './evaluationStore'

// Tipos de dados
export interface EvaluationResult {
  id: string
  score: number
  date: string
  evaluator: string
  sectors: { name: string } | null
  deleted_at?: string | null
}

// Tipo para a consulta completa de exportação
// ✅ CORREÇÃO: Permite que campos de texto sejam nulos
interface EvaluationExport {
  id: string
  score: number
  date: string | null
  evaluator: string
  sectors: { name: string } | null
  responsible: string | null
  observations: string | null
  details: { [key: string]: string | number } | null
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
        // --- LÓGICA (Sem filtro) ---
        const {
          data: queryData,
          error: queryError,
          count: queryCount,
        } = await supabaseClient
          .from('evaluations')
          .select('id, score, date, evaluator, deleted_at, sectors(*)', {
            count: 'exact',
          })
          .is('deleted_at', null)
          .order('score', { ascending: false })
          .range(from, to)

        data = queryData as unknown as EvaluationResult[]
        error = queryError
        count = queryCount
      } else {
        // --- LÓGICA (Com filtro) ---
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
          'search_evaluations',
          {
            search_term: filter,
            page_limit: recordsPerPage,
            page_offset: from,
          },
        )

        if (rpcError) throw rpcError

        data = rpcData.data
        error = rpcError
        count = rpcData.count
      }

      if (error) throw error

      results.value = data as unknown as EvaluationResult[]
      totalPages.value = Math.ceil((count || 0) / recordsPerPage) || 1
    } catch (error) {
      console.error('Erro ao carregar ranking:', error)
      results.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function restoreEvaluation(id: string) {
    const uiStore = useUiStore()
    const { useAuthStore } = await import('./authStore')
    const authStore = useAuthStore()

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
      // Atualiza a lista (o item sumirá da lixeira)
      await fetchResults(currentPage.value, filterText.value)
    } catch (error: any) {
      console.error('Erro ao restaurar:', error)
      uiStore.showToast(
        error.message || 'Falha ao restaurar o registro.',
        'error',
      )
    }
  }

  async function fetchEvaluationForEdit(id: string) {
    const uiStore = useUiStore()
    const evaluationStore = useEvaluationStore()
    const { useAuthStore } = await import('./authStore')
    const authStore = useAuthStore()

    if (authStore.userRole !== 'admin') {
      uiStore.showToast('Apenas administradores podem editar.', 'error')
      return
    }

    try {
      // 1. Delega a busca dos dados para a evaluationStore
      await evaluationStore.fetchEvaluationForEdit(id)

      // 2. Se a busca foi bem-sucedida...
      if (evaluationStore.dataToEdit) {
        // 3. Fecha o modal de ranking para o usuário ver o formulário
        uiStore.closeModal()
      } else {
        // Se não encontrou dados, mostra um erro
        throw new Error('Não foi possível carregar a avaliação para edição.')
      }
    } catch (error: any) {
      console.error('Erro ao buscar para editar:', error)
      uiStore.showToast(error.message, 'error')
    }
  }

  async function fetchAllResultsForExport(): Promise<EvaluationExport[]> {
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'search_evaluations',
      {
        search_term: '',
        page_limit: 10000,
        page_offset: 0,
      },
    )

    if (rpcError) throw rpcError
    if (!rpcData?.data) return []

    return rpcData.data as EvaluationExport[]
  }

  // --- INÍCIO DAS FUNÇÕES AUXILIARES PARA A MÁSCARA DE ID ---

  function formatDateForId(dateStr: string | null | undefined): string {
    // Garante que é uma string e não está vazia
    if (!dateStr) {
      return '00000000' // Retorna um padrão caso a data seja nula/undefined/vazia
    }

    const parts = dateStr.split('T')

    const datePart = parts[0]
    if (datePart) {
      return datePart.replace(/-/g, '')
    }

    return '00000000'
  }

  /**
   * Preenche um ID numérico com zeros à esquerda até ter 6 dígitos.
   * (ex: 60 -> "000060")
   */
  function padId(id: number | string): string {
    return id.toString().padStart(6, '0')
  }

  // --- FIM DAS FUNÇÕES AUXILIARES ---

  async function exportAllResults() {
    const uiStore = useUiStore()
    isLoading.value = true
    try {
      const data = await fetchAllResultsForExport()
      if (!data || data.length === 0) {
        throw new Error('Não há dados para exportar.')
      }

      const formattedData = data.map((item) => ({
        // Aqui criamos a máscara: YYYYMMDD-XXXXXX
        'ID (Avaliação)': `${formatDateForId(item.date)}-${padId(item.id)}`,

        // Lida com data nula também para a coluna 'Data'
        'Data': item.date
          ? new Date(item.date).toLocaleDateString('pt-BR', {
              timeZone: 'UTC',
            })
          : 'Data Inválida',

        'Setor': item.sectors ? item.sectors.name : 'N/A',

        'Pontuação': item.score,
        'Avaliador': item.evaluator,
        'Responsável': item.responsible ?? '',
        'Observações': item.observations ?? '', // Adicionado '?? ''' para segurança
      }))

      const timestamp = new Date().toISOString().split('T')[0]
      exportToExcel(formattedData, `Export_Klin_Avaliacoes_${timestamp}`)
      uiStore.showToast('Exportação iniciada!', 'success')
    } catch (error: any) {
      uiStore.showToast(error.message, 'error')
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
    restoreEvaluation,
    fetchEvaluationForEdit,
    exportAllResults,
  }
})