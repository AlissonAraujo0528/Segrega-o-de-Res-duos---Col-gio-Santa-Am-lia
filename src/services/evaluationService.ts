import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';

// Atalhos de tipagem para não ficar escrevendo nomes longos
type EvaluationRow = Database['public']['Tables']['evaluations']['Row'];
type EvaluationInsert = Database['public']['Tables']['evaluations']['Insert'];
type EvaluationUpdate = Database['public']['Tables']['evaluations']['Update'];
type SectorRow = Database['public']['Tables']['sectors']['Row']; // Confirme se no banco é 'sectors' ou 'setores'

export const evaluationService = {
  
  /**
   * Busca inteligente de setores (com debounce deve ser feito no front)
   */
  async searchSectors(query: string) {
    if (!query) return [];
    
    const { data, error } = await supabase
      .from('sectors') // Verifique se o nome é 'sectors' ou 'setores' no types/supabase.ts
      .select('id, name, default_responsible')
      .ilike('name', `%${query}%`)
      .limit(10)
      .order('name');

    if (error) throw new Error(`Erro na busca: ${error.message}`);
    return data as SectorRow[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error('Avaliação não encontrada.');
    
    // Normalização inteligente de dados (Flat object para o front)
    const details = data.details as { photo_url?: string } | null;
    return {
      ...data,
      photo_url: details?.photo_url || null // Prioriza o JSONB
    };
  },

  /**
   * Upload Inteligente: Renomeia e organiza arquivos
   */
  async uploadPhoto(file: File, userId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('evaluations')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error('Falha no upload da imagem.');

    const { data } = supabase.storage
      .from('evaluations')
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  async create(payload: EvaluationInsert) {
    const { data, error } = await supabase
      .from('evaluations')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar: ${error.message}`);
    return data;
  },

  async update(id: string, payload: EvaluationUpdate) {
    const { data, error } = await supabase
      .from('evaluations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('evaluations').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteAll() {
    // Tenta RPC primeiro (mais seguro), senão faz hard delete
    const { error: rpcError } = await supabase.rpc('delete_all_evaluations');
    if (!rpcError) return;

    // Fallback: Delete manual (cuidado com RLS)
    const { error } = await supabase.from('evaluations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error('Não foi possível limpar o banco.');
  }
};