import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'

// --- TIPOS ---

export interface KpiData {
  average_score: number      // Média geral
  total_evaluations: number  // Total de docs
  top_sector: string         // Nome do melhor setor
}

export interface RankedSector {
  sector_id: string
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

export interface HistoryItem {
  id: string
  created_at: string
  nota: number
  observacao?: string
  cleanObservation?: string
  issues: string[]
  foto_url?: string | null
  responsible_name?: string
  setor_nome: string // Propriedade unificada para a UI
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
  
  // --- HELPERS ---

  // Gera datas UTC para garantir que pegamos o mês inteiro independente do fuso horário
  function getUtcMonthRange(month: number, year: number) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString()
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString()
    return { start, end }
  }

  // --- ACTIONS ---

  async function fetchAvailablePeriods() {
    try {
      const { data, error: err } = await supabaseClient
        .from('evaluations') 
        .select('created_at')
        .order('created_at', { ascending: false })

      if (err) throw err

      const uniqueMap = new Map<string, string>()
      
      data.forEach((item: { created_at: string }) => {
        const date = new Date(item.created_at)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${year}-${month.toString().padStart(2, '0')}`
        
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
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

  async function fetchDashboardData(month: number, year: number) {
    isLoading.value = true
    error.value = null
    
    kpis.value = { average_score: 0, total_evaluations: 0, top_sector: '-' }
    medalLists.value = { gold: [], silver: [], bronze: [] }

    try {
      const { start, end } = getUtcMonthRange(month, year)

      const { data, error: err } = await supabaseClient
        .from('evaluations') 
        .select(`
          score,
          sector_id,
          sector, 
          sectors ( name )
        `)
        .gte('created_at', start)
        .lte('created_at', end)

      if (err) throw err
      if (!data || data.length === 0) return 

      const totalDocs = data.length
      const sumTotal = data.reduce((acc, curr: any) => acc + (curr.score || 0), 0)
      
      const sectorsMap = new Map<string, { name: string, totalScore: number, count: number }>()

      data.forEach((item: any) => {
        const sId = item.sector_id || item.sector || 'unknown'
        
        // Resolve nome com segurança
        const relationName = Array.isArray(item.sectors) ? item.sectors[0]?.name : item.sectors?.name
        const sName = relationName || item.sector || 'Setor Desconhecido'
        
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
        if (key === 'unknown') return
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

      // CORREÇÃO DO ERRO TS2532:
      // Usamos `rankedSectors[0]?.sector_name` com optional chaining (?) 
      // e Nullish Coalescing (??) para garantir que nunca seja nulo/undefined.
      const topSectorName = rankedSectors.length > 0 ? (rankedSectors[0]?.sector_name ?? '-') : '-'

      kpis.value = {
        average_score: parseFloat((sumTotal / totalDocs).toFixed(1)),
        total_evaluations: totalDocs,
        top_sector: topSectorName
      }

    } catch (err: any) {
      console.error("Erro no dashboard:", err)
      error.value = "Erro ao carregar dados."
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRecentHistory(month: number, year: number) {
    isLoading.value = true
    recentEvaluations.value = [] 
    
    try {
      const { start, end } = getUtcMonthRange(month, year)

      const { data, error: err } = await supabaseClient
        .from('evaluations') 
        .select(`
          id, created_at, score, observations, responsible, details, sector,
          sectors ( name )
        `)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (err) throw err

      recentEvaluations.value = (data || []).map((item: any) => {
        let issues: string[] = []
        let cleanObs = item.observations || '' 

        if (item.observations && item.observations.trim().startsWith('{')) {
          try {
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
                 issues.push(labels[key] || key)
               }
             })
          } catch (e) {
             cleanObs = item.observations
          }
        }
        
        // Resolve nome do setor com segurança
        const relationName = Array.isArray(item.sectors) ? item.sectors[0]?.name : item.sectors?.name
        const nomeResolvido = relationName || item.sector || 'Sem Nome'

        return {
          id: item.id,
          created_at: item.created_at,
          nota: item.score,
          observacao: item.observations,
          cleanObservation: cleanObs,
          issues: issues,
          foto_url: item.details?.photo_url || null,
          responsible_name: item.responsible,
          setor_nome: nomeResolvido
        }
      })

    } catch (err: any) {
      console.error("Erro histórico:", err)
      error.value = "Erro ao carregar histórico."
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