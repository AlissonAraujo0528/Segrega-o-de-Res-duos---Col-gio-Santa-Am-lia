import { supabaseClient } from '../lib/supabaseClient';

// --- Tipos de Dados para o Dashboard ---

export interface KPI {
  totalAudits: number;
  averageScore: number;
  topSector: string;
  monthlyGrowth: number; // Comparativo com mês anterior (%)
}

export interface ChartDataSet {
  labels: string[];
  data: number[];
}

export interface DashboardData {
  kpis: KPI;
  history: ChartDataSet;   // Dados para gráfico de evolução (Linha)
  bySector: ChartDataSet;  // Dados para gráfico de setores (Barra)
  compliance: ChartDataSet; // Dados para gráfico de conformidade (Pizza)
}

// --- Serviço ---

export const dashboardService = {
  
  /**
   * Busca e processa todos os dados para o Dashboard
   * Realiza agregação no cliente (client-side aggregation) para flexibilidade
   */
  async getDashboardMetrics(): Promise<DashboardData> {
    try {
      // 1. Buscar dados dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabaseClient
        .from('evaluations')
        .select(`
          id,
          score,
          date,
          sectors ( name )
        `)
        .gte('date', sixMonthsAgo.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return this.getEmptyState();

      // 2. Processamento dos Dados (Agregações)
      const processed = this.processData(data);
      
      return processed;

    } catch (error: any) {
      console.error('Erro no Dashboard Service:', error.message);
      throw new Error('Falha ao calcular métricas do dashboard.');
    }
  },

  /**
   * Lógica matemática de processamento (Privada)
   */
  processData(data: any[]): DashboardData {
    // --- Variáveis Auxiliares ---
    const totalScore = data.reduce((sum, item) => sum + (item.score || 0), 0);
    const monthsMap = new Map<string, { sum: number; count: number }>();
    const sectorsMap = new Map<string, { sum: number; count: number }>();
    let compliantCount = 0; // Notas >= 15 (Bom/Excelente)

    // --- Iteração Única (Performance O(n)) ---
    data.forEach(item => {
      // 1. Dados Temporais (Mês/Ano)
      const date = new Date(item.date);
      // Format: "Jan 2026"
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }); 
      
      if (!monthsMap.has(monthKey)) monthsMap.set(monthKey, { sum: 0, count: 0 });
      const monthEntry = monthsMap.get(monthKey)!;
      monthEntry.sum += item.score;
      monthEntry.count += 1;

      // 2. Dados por Setor
      // Tratamento seguro para nome do setor (pode vir como array ou objeto dependendo do Supabase)
      let sectorName = 'Outros';
      if (item.sectors) {
        sectorName = Array.isArray(item.sectors) ? item.sectors[0]?.name : item.sectors.name;
      }
      
      if (!sectorsMap.has(sectorName)) sectorsMap.set(sectorName, { sum: 0, count: 0 });
      const sectorEntry = sectorsMap.get(sectorName)!;
      sectorEntry.sum += item.score;
      sectorEntry.count += 1;

      // 3. Conformidade
      if (item.score >= 15) compliantCount++;
    });

    // --- Formatação para Gráficos ---

    // Gráfico de Linha (Histórico)
    const historyLabels = Array.from(monthsMap.keys());
    const historyData = Array.from(monthsMap.values()).map(v => Number((v.sum / v.count).toFixed(1)));

    // Gráfico de Barras (Setores) - Top 5
    const sectorArray = Array.from(sectorsMap.entries())
      .map(([name, val]) => ({ name, avg: val.sum / val.count }))
      .sort((a, b) => b.avg - a.avg) // Melhores primeiro
      .slice(0, 5); // Apenas top 5

    // KPI: Melhor Setor (CORREÇÃO 1: Optional Chaining)
    const bestSector = sectorArray[0]?.name ?? '-';

    // KPI: Crescimento Mensal (Comparar último mês com penúltimo)
    let growth = 0;
    if (historyData.length >= 2) {
      // CORREÇÃO 2: Nullish Coalescing (?? 0) para garantir que são números
      const last = historyData[historyData.length - 1] ?? 0;
      const prev = historyData[historyData.length - 2] ?? 0;
      
      growth = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    }

    return {
      kpis: {
        totalAudits: data.length,
        averageScore: Number((totalScore / data.length).toFixed(1)),
        topSector: bestSector,
        monthlyGrowth: Number(growth.toFixed(1))
      },
      history: {
        labels: historyLabels,
        data: historyData
      },
      bySector: {
        labels: sectorArray.map(s => s.name),
        data: sectorArray.map(s => Number(s.avg.toFixed(1)))
      },
      compliance: {
        labels: ['Conforme', 'Irregular'],
        data: [compliantCount, data.length - compliantCount]
      }
    };
  },

  /**
   * Retorna estrutura zerada para evitar erros na UI antes de carregar
   */
  getEmptyState(): DashboardData {
    return {
      kpis: { totalAudits: 0, averageScore: 0, topSector: '-', monthlyGrowth: 0 },
      history: { labels: [], data: [] },
      bySector: { labels: [], data: [] },
      compliance: { labels: [], data: [] }
    };
  }
};