import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import { exportToExcel } from '../lib/exportToExcel'
import { useUiStore } from './uiStore'
import { useEvaluationStore } from './evaluationStore'

// Tipos de dados alinhados com o Banco de Dados (Inglês)
export interface EvaluationResult {
  id: string // UUID
  score: number
  date: string
  evaluator: string
  // Relação com a tabela 'sectors'
  sectors: { name: string } | null
  // Coluna antiga (texto) para fallback
  sector?: string | null
  
  // --- CAMPOS CALCULADOS (PARA O FRONTEND) ---
  setor_nome?: string 
  data_formatada?: string // <--- ADICIONADO PARA CORRIGIR O ERRO TS2339
  
  deleted_at?: string | null
}

// Tipo para a consulta completa de exportação
interface EvaluationExport {
  id: string
  score: number
  date: string | null
  evaluator: string
  sector?: string | null // Coluna antiga
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
    
    // NOTA: Para paginação manual sem range(), o cálculo do offset é diferente se usar RPC,
    // mas sua RPC usa LIMIT/OFFSET, então 'from' é o offset.
    
    try {
      let data: any[] | null = null
      let error: any = null
      let count: number | null = null

      if (!filter) {
        // --- LÓGICA (Sem filtro - Busca Padrão) ---
        const to = from + recordsPerPage - 1
        const {
          data: queryData,
          error: queryError,
          count: queryCount,
        } = await supabaseClient
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
          .is('deleted_at', null) // Filtra excluídos
          .order('score', { ascending: false })
          .range(from, to)

        data = queryData
        error = queryError
        count = queryCount
      } else {
        // --- LÓGICA (Com filtro - RPC) ---
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
          'search_evaluations',
          {
            search_term: filter,
            page_limit: recordsPerPage,
            page_offset: from,
          },
        )

        if (rpcError) throw rpcError

        // A RPC retorna { data: [...], count: N }
        data = rpcData.data
        error = rpcError
        count = rpcData.count
      }

      if (error) throw error

      // === PROCESSAMENTO DOS DADOS (Popula a interface) ===
      if (data) {
        results.value = data.map((item: any) => {
          // Lógica de Fallback de Nome:
          // 1. Tenta o nome da nova relação (sectors.name)
          // 2. Se falhar, tenta o nome da coluna antiga (item.sector)
          // 3. Se tudo falhar, exibe 'Setor Desconhecido'
          const nomeResolvido = item.sectors?.name || item.sector || 'Setor Desconhecido';

          return {
            ...item,
            setor_nome: nomeResolvido,
            // Cria o campo data_formatada que a interface agora reconhece
            data_formatada: item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'
          }
        })
      } else {
        results.value = []
      }

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
      // Atualiza a lista
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
      await evaluationStore.fetchEvaluationForEdit(id)

      if (evaluationStore.dataToEdit) {
        uiStore.closeModal() // Fecha o modal de ranking
      } else {
        throw new Error('Não foi possível carregar a avaliação para edição.')
      }
    } catch (error: any) {
      console.error('Erro ao buscar para editar:', error)
      uiStore.showToast(error.message, 'error')
    }
  }

  async function fetchAllResultsForExport(): Promise<EvaluationExport[]> {
    // Para exportação segura, usamos a RPC sem filtro e com limite alto
    // Se a RPC não estiver disponível ou falhar, fallback para select padrão pode ser necessário,
    // mas assumindo que search_evaluations existe:
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

  // --- FUNÇÕES AUXILIARES DE EXPORTAÇÃO ---

  function formatDateForId(dateStr: string | null | undefined): string {
    if (!dateStr) return '00000000'
    const parts = dateStr.split('T')
    const datePart = parts[0]
    return datePart ? datePart.replace(/-/g, '') : '00000000'
  }

  function padId(id: string): string {
    if (!id) return '000000'
    return id.slice(-6).toUpperCase()
  }

  async function exportAllResults() {
    const uiStore = useUiStore()
    isLoading.value = true
    try {
      const data = await fetchAllResultsForExport()
      if (!data || data.length === 0) {
        throw new Error('Não há dados para exportar.')
      }

      const formattedData = data.map((item) => {
        // Mesma lógica de fallback para o Excel
        const nomeSetor = item.sectors?.name || item.sector || 'Setor Desconhecido';

        return {
          'ID (Ref)': `${formatDateForId(item.date)}-${padId(item.id)}`,
          'Data': item.date
            ? new Date(item.date).toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
              })
            : 'Data Inválida',
  
          'Setor': nomeSetor,
  
          'Pontuação': item.score,
          'Avaliador': item.evaluator,
          'Responsável': item.responsible ?? '',
          'Observações': item.observations ?? '',
        }
      })

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