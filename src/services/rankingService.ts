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
  async getRankings(page = 1, limit = 10, search = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

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
      // ALTERAÇÃO AQUI: Ordenar por DATA (mais recente primeiro)
      .order('date', { ascending: false }) 
      // Desempate: se for mesma data, pega a criada por último (hora/minuto)
      .order('created_at', { ascending: false }) 
      .range(from, to);

    if (search) {
      query = query.or(`evaluator.ilike.%${search}%,responsible.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    const flatData: RankingItem[] = (data || []).map((item: any) => ({
      id: item.id.toString(),
      score: item.score,
      date: item.date,
      evaluator: item.evaluator,
      responsible: item.responsible || 'N/A',
      observations: item.observations,
      sector_name: item.sectors?.name || 'Setor Removido'
    }));

    return { data: flatData, count: count || 0 };
  },

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
      // ALTERAÇÃO AQUI TAMBÉM: Exportar do mais novo pro mais antigo
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