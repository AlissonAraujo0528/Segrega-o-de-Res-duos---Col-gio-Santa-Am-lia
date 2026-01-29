import { supabaseClient } from '../lib/supabaseClient';

// Definindo a "forma" dos nossos dados (Fonte da Verdade)
export interface RankingItem {
  id: string;
  score: number;
  date: string | null;
  evaluator: string; // CORREÇÃO: Removido '| null' pois garantimos valor abaixo
  observations: string | null;
  sector_name: string;
  responsible: string | null;
}

export const rankingService = {
  /**
   * Busca o ranking com paginação e filtros opcionais
   */
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
        observations,
        sectors ( name, responsible )
      `, { count: 'exact' })
      .order('score', { ascending: false })
      .order('date', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error(`Erro ao carregar ranking: ${error.message}`);

    // Mapeamento com tipagem segura
    const items: RankingItem[] = (data || []).map((item: any) => ({
      id: item.id,
      score: item.score,
      date: item.date,
      evaluator: item.evaluator || 'Anônimo', // Garante que nunca é null
      observations: item.observations,
      sector_name: item.sectors?.name || 'Setor Desconhecido',
      responsible: item.sectors?.responsible || 'Não informado'
    }));

    // Filtragem no client
    const filteredItems = search 
      ? items.filter((i: RankingItem) => 
          i.sector_name.toLowerCase().includes(search.toLowerCase()) ||
          i.evaluator.toLowerCase().includes(search.toLowerCase())
        )
      : items;

    return {
      data: filteredItems,
      count: count || 0
    };
  },

  /**
   * Busca TUDO para exportação (sem paginação)
   */
  async getAllForExport() {
    const { data, error } = await supabaseClient
      .from('evaluations')
      .select(`
        id, score, date, evaluator, observations,
        sectors ( name, responsible )
      `)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item: any) => ({
      id: item.id,
      data: item.date,
      setor: item.sectors?.name || 'N/A',
      nota: item.score,
      avaliador: item.evaluator,
      responsavel: item.sectors?.responsible,
      obs: item.observations
    }));
  }
};