import { supabaseClient } from '../lib/supabaseClient';

export interface RankingItem {
  id: string;
  score: number;
  date: string | null;
  evaluator: string;
  sector_name: string;
  responsible: string; 
  observations?: string | null;
}

export const rankingService = {
  /**
   * Busca ranking paginado
   */
  async getRankings(page = 1, limit = 10, search = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Base da query na tabela 'evaluations'
    let query = supabaseClient
      .from('evaluations')
      .select(`
        id,
        score,
        date,
        evaluator,
        responsible, 
        observations,
        sectors ( name )
      `, { count: 'exact' })
      .order('score', { ascending: false })
      .range(from, to);

    // Filtro de busca (apenas nas colunas de texto da própria evaluation para evitar erro de join)
    if (search) {
      query = query.or(`evaluator.ilike.%${search}%,responsible.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    // Mapeamento seguro usando os tipos do seu supabase.ts
    const flatData: RankingItem[] = (data || []).map((item: any) => ({
      id: item.id.toString(), // Supabase retorna ID numérico às vezes, garantimos string
      score: item.score,
      date: item.date,
      evaluator: item.evaluator,
      responsible: item.responsible || 'N/A', // Campo responsible está em evaluations
      observations: item.observations,
      // Pega o nome do setor da relação
      sector_name: item.sectors?.name || 'Setor Removido'
    }));

    return { data: flatData, count: count || 0 };
  },

  /**
   * Busca dados para Excel
   */
  async getAllForExport() {
    const { data, error } = await supabaseClient
      .from('evaluations')
      .select(`
        id,
        score,
        date,
        evaluator,
        responsible,
        observations,
        sectors ( name )
      `)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item: any) => ({
      data: item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-',
      setor: item.sectors?.name || 'Setor Removido',
      responsavel: item.responsible,
      nota: item.score,
      avaliador: item.evaluator,
      obs: item.observations
    }));
  }
};