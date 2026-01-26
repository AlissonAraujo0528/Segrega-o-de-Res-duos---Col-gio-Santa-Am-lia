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
  sector_id: string          // UUID
  sector_name: string
  average: number
  count: number
}

export interface MedalData {
  gold: RankedSector[]   
  silver: RankedSector[] 
  bronze: RankedSector[] 
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
    name: string // 'nome' virou 'name'
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
  const recentEvaluations = ref<HistoryItem[]>([]) 
  
  // --- ACTIONS ---

  /**
   * Busca todos os meses que possuem avaliações registradas
   * CORREÇÃO: Tabela 'evaluations'
   */
  async function fetchAvailablePeriods() {
    try {
      const { data, error: err } = await supabaseClient
        .from('evaluations') // <--- CORRIGIDO
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
   * CORREÇÃO: Tabelas e colunas em inglês
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
        .from('evaluations') // <--- CORRIGIDO
        .select(`
          score,             // era 'nota'
          sector_id,
          sectors ( name )   // era 'setores ( nome )'
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (err) throw err
      if (!data || data.length === 0) return 

      const totalDocs = data.length
      // Mapeia score (nota) corretamente
      const sumTotal = data.reduce((acc, curr: any) => acc + (curr.score || 0), 0)
      
      const sectorsMap = new Map<string, { name: string, totalScore: number, count: number }>()

      data.forEach((item: any) => {
        const sId = item.sector_id
        const sName = item.sectors?.name || 'Desconhecido' // item.sectors (tabela) .name (coluna)
        const score = item.score || 0

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
   * CORREÇÃO: Tabelas e colunas em inglês
   */
  async function fetchRecentHistory(month: number, year: number) {
    isLoading.value = true
    recentEvaluations.value = [] 
    
    try {
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

      // CORREÇÃO: Colunas corretas do SQL
      const { data, error: err } = await supabaseClient
        .from('evaluations') 
        .select(`
          id, created_at, score, observations, responsible,
          sectors ( name )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (err) throw err

      recentEvaluations.value = (data || []).map((item: any) => {
        let details: string[] = []
        // Mapeia colunas do banco para as propriedades esperadas pelo front
        // Banco: observations -> Front: observacao (para manter compatibilidade com o componente visual)
        let cleanObs = item.observations || '' 

        try {
          if (item.observations && item.observations.startsWith('{')) {
             const parts = item.observations.split('\n\n')
             const jsonPart = parts[0]
             
             cleanObs = parts.slice(1).join('\n')
             
             const parsed = JSON.parse(jsonPart)
             
             const labels: Record<string, string> = {
               'organicos': 'Orgânicos Misturados',
               'sanitarios': 'Papéis Sanitários',
               'outros': 'Outros Não Recicláveis',
               'nivel': 'Nível dos Coletores'
             }
             
             Object.entries(parsed).forEach(([key, val]) => {
               if (String(val) === '2') {
                 details.push(labels[key] || key)
               }
             })
          }
        } catch (e) { }
        
        // Retorna objeto formatado para o HistoryItem
        return {
          id: item.id,
          created_at: item.created_at,
          nota: item.score, // Mapeia score -> nota
          observacao: item.observations,
          cleanObservation: cleanObs,
          issues: details,
          foto_url: null, // Se tiver URL no JSON, extrair aqui
          responsible_name: item.responsible, // Mapeia responsible -> responsible_name
          setores: {
            nome: item.sectors?.name // Mapeia name -> nome
          }
        }
      }) as unknown as HistoryItem[]

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
    recentEvaluations,
    fetchAvailablePeriods,
    fetchDashboardData,
    fetchRecentHistory, 
  }
})