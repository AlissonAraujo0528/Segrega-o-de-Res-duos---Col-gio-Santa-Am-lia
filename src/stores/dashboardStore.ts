import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'

// --- Tipos para o Dashboard ---

export interface KpiData {
  average_score: number      // Média geral (0 a 20)
  total_evaluations: number  // Total de avaliações no mês
  top_sector: string         // Melhor setor
}

export interface RankedSector {
  sector_id: number
  sector_name: string
  average: number
  count: number
}

export interface MedalData {
  gold: RankedSector[]   // Média >= 19
  silver: RankedSector[] // Média >= 15
  bronze: RankedSector[] // Média < 15
}

export interface Period {
  id: string    // "2025-11"
  label: string // "Novembro de 2025"
}

// Interface para o item do histórico
export interface HistoryItem {
  id: string
  created_at: string
  nota: number
  observacao?: string
  cleanObservation?: string
  issues: string[]
  foto_url?: string | null
  responsible_name?: string
  setores?: {
    nome: string
  }
}

export const useDashboardStore = defineStore('dashboard', () => {
  // --- STATE ---
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const kpis = ref<KpiData>({
    average_score: 0,
    total_evaluations: 0,
    top_sector: '-'
  })
  
  const medalLists = ref<MedalData>({
    gold: [],
    silver: [],
    bronze: []
  })
  
  const availablePeriods = ref<Period[]>([])
  const recentEvaluations = ref<HistoryItem[]>([]) // Novo estado para o histórico
  
  // --- ACTIONS ---

  /**
   * Busca todos os meses que possuem avaliações registradas
   */
  async function fetchAvailablePeriods() {
    try {
      const { data, error: err } = await supabaseClient
        .from('avaliacoes')
        .select('created_at')
        .order('created_at', { ascending: false })

      if (err) throw err

      const uniqueMap = new Map<string, string>()
      
      data.forEach((item: { created_at: string }) => {
        const date = new Date(item.created_at)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${year}-${month.toString().padStart(2, '0')}`
        
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long' })
        const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`
        
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, label)
        }
      })

      availablePeriods.value = Array.from(uniqueMap.entries()).map(([id, label]) => ({
        id,
        label
      }))

    } catch (err: any) {
      console.error("Erro ao buscar períodos:", err)
      error.value = "Não foi possível carregar os períodos."
    }
  }

  /**
   * Busca e calcula os dados KPIs para um mês/ano específico
   */
  async function fetchDashboardData(month: number, year: number) {
    isLoading.value = true
    error.value = null
    
    kpis.value = { average_score: 0, total_evaluations: 0, top_sector: '-' }
    medalLists.value = { gold: [], silver: [], bronze: [] }

    try {
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

      const { data, error: err } = await supabaseClient
        .from('avaliacoes')
        .select(`
          nota,
          setor_id,
          setores ( nome )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (err) throw err
      if (!data || data.length === 0) return 

      const totalDocs = data.length
      const sumTotal = data.reduce((acc, curr) => acc + (curr.nota || 0), 0)
      
      const sectorsMap = new Map<number, { name: string, totalScore: number, count: number }>()

      data.forEach((item: any) => {
        const sId = item.setor_id
        const sName = item.setores?.nome || 'Desconhecido'
        const score = item.nota || 0

        if (!sectorsMap.has(sId)) {
          sectorsMap.set(sId, { name: sName, totalScore: 0, count: 0 })
        }
        
        const entry = sectorsMap.get(sId)!
        entry.totalScore += score
        entry.count += 1
      })

      const rankedSectors: RankedSector[] = []
      
      sectorsMap.forEach((val, key) => {
        rankedSectors.push({
          sector_id: key,
          sector_name: val.name,
          average: parseFloat((val.totalScore / val.count).toFixed(1)),
          count: val.count
        })
      })

      rankedSectors.sort((a, b) => b.average - a.average)

      medalLists.value.gold = rankedSectors.filter(s => s.average >= 19)
      medalLists.value.silver = rankedSectors.filter(s => s.average >= 15 && s.average < 19)
      medalLists.value.bronze = rankedSectors.filter(s => s.average < 15)

      kpis.value = {
        average_score: parseFloat((sumTotal / totalDocs).toFixed(1)),
        total_evaluations: totalDocs,
        top_sector: rankedSectors.length > 0 ? (rankedSectors[0]?.sector_name ?? '-') : '-'
      }

    } catch (err: any) {
      console.error("Erro ao processar dashboard:", err)
      error.value = err.message || "Erro desconhecido."
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Busca o histórico detalhado para a aba de "Histórico"
   */
  async function fetchRecentHistory(month: number, year: number) {
    isLoading.value = true
    recentEvaluations.value = [] // Limpa antes de buscar
    
    try {
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

      const { data, error: err } = await supabaseClient
        .from('avaliacoes')
        .select(`
          id, created_at, nota, observacao, foto_url, responsible_name,
          setores ( nome )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (err) throw err

      // Processar os dados para extrair os "detalhes" do JSON na observação
      recentEvaluations.value = (data || []).map((item: any) => {
        let details: string[] = []
        let cleanObs = item.observacao || ''

        try {
          // Tenta extrair o JSON do começo da observação
          // O formato esperado é: '{"q1":"5",...}\n\nTexto opcional'
          if (item.observacao && item.observacao.startsWith('{')) {
             // Simples split na primeira quebra de linha dupla para separar JSON do texto
             const parts = item.observacao.split('\n\n')
             const jsonPart = parts[0]
             
             // O resto é a observação de texto real
             cleanObs = parts.slice(1).join('\n')
             
             const parsed = JSON.parse(jsonPart)
             
             // Mapeamento de IDs de perguntas para Labels legíveis
             // (Importante: mantenha sintonizado com o EvaluationForm.vue)
             const labels: Record<string, string> = {
               'organicos': 'Orgânicos Misturados',
               'sanitarios': 'Papéis Sanitários',
               'outros': 'Outros Não Recicláveis',
               'nivel': 'Nível dos Coletores'
             }
             
             // Se a resposta for "2" (Regular), adiciona à lista de problemas
             Object.entries(parsed).forEach(([key, val]) => {
               if (String(val) === '2') {
                 details.push(labels[key] || key)
               }
             })
          }
        } catch (e) {
          // Se falhar o parse, assume que é tudo texto normal
          // console.warn('Falha ao parsear observação:', e)
        }
        
        return {
          ...item,
          cleanObservation: cleanObs,
          issues: details
        }
      }) as HistoryItem[]

    } catch (err: any) {
      console.error("Erro ao buscar histórico:", err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    kpis,
    medalLists,
    availablePeriods,
    recentEvaluations, // Exportando o novo estado
    fetchAvailablePeriods,
    fetchDashboardData,
    fetchRecentHistory, // Exportando a nova action
  }
})