import { supabaseClient } from '../lib/supabaseClient';
import type { Database } from '../types/supabase';

// Tipos auxiliares derivados do banco de dados
type EvaluationInsert = Database['public']['Tables']['evaluations']['Insert'];
type EvaluationUpdate = Database['public']['Tables']['evaluations']['Update'];
type SectorRow = Database['public']['Tables']['sectors']['Row'];

export const evaluationService = {
  
  /**
   * Busca setores para o select/combobox
   */
  async searchSectors(query: string) {
    if (!query) return [];
    
    const { data, error } = await supabaseClient
      .from('sectors') 
      .select('id, name, default_responsible')
      .ilike('name', `%${query}%`)
      .limit(10)
      .order('name');

    if (error) throw new Error(`Erro na busca: ${error.message}`);
    return data as SectorRow[];
  },

  /**
   * Busca uma avaliação específica por ID
   */
  async getById(id: string) {
    const { data, error } = await supabaseClient
      .from('evaluations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error('Avaliação não encontrada.');
    
    // Normalização segura do campo JSONB 'details'
    const details = data.details as { photo_url?: string } | null;
    
    return {
      ...data,
      photo_url: details?.photo_url || null // Extrai a URL da foto se existir
    };
  },

  /**
   * Upload de imagem para o bucket 'evaluations'
   */
  async uploadPhoto(file: File, userId: string) {
    const fileExt = file.name.split('.').pop();
    // Gera nome único para evitar colisão e cache: user_id/timestamp_random.ext
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('evaluations')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error('Falha no upload da imagem.');

    const { data } = supabaseClient.storage
      .from('evaluations')
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  /**
   * Cria uma nova avaliação
   */
  async create(payload: EvaluationInsert) {
    const { data, error } = await supabaseClient
      .from('evaluations')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar: ${error.message}`);
    return data;
  },

  /**
   * Atualiza uma avaliação existente
   */
  async update(id: string, payload: EvaluationUpdate) {
    const { data, error } = await supabaseClient
      .from('evaluations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
    return data;
  },

  /**
   * Remove uma avaliação (Soft delete se configurado, ou hard delete)
   */
  async delete(id: string) {
    const { error } = await supabaseClient
      .from('evaluations')
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(error.message);
  },

  /**
   * Limpa todas as avaliações (Ação administrativa)
   */
  async deleteAll() {
    // 1. Tenta usar RPC (Stored Procedure) se existir - Mais seguro e rápido
    const { error: rpcError } = await supabaseClient.rpc('delete_all_evaluations');
    
    if (!rpcError) return;

    // 2. Fallback: Delete manual se a RPC não existir
    // O filtro .neq id '0...' é um truque para selecionar todos os registros
    // (necessário pois o Supabase bloqueia deletes sem where por segurança)
    const { error } = await supabaseClient
      .from('evaluations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (error) throw new Error('Não foi possível limpar o banco de dados.');
  }
};