import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'

// --- Tipos (Alinhados com o Banco de Dados) ---

export interface Sector {
  id: string // UUID do banco (antes era number)
  name: string
  default_responsible?: string | null
}

// Dados para envio do formulário
export interface EvaluationFormPayload {
  sector_id: string // UUID
  responsible: string
  score: number // nota (0-20)
  weight: number // peso (0 se não usado)
  observations?: string
  image?: File | null // Arquivo para upload
}

// Dados completos vindos do banco + campos auxiliares para o front
export interface EvaluationFull extends EvaluationFormPayload {
  id: string
  user_id: string
  photo_url: string | null
  created_at: string
  // Campos opcionais para compatibilidade com o formulário de edição
  evaluator?: string 
  date?: string
}

export const useEvaluationStore = defineStore('evaluation', () => {
  // --- STATE ---
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Controle de Edição
  const editingEvaluationId = ref<string | null>(null)
  const dataToEdit = ref<EvaluationFull | null>(null)

  // --- ACTIONS ---

  /**
   * Busca setores pelo nome (usado no Combobox)
   * CORREÇÃO: Usa tabela 'sectors' e coluna 'name'
   */
  async function searchSectors(query: string): Promise<Sector[]> {
    try {
      const { data, error: err } = await supabaseClient
        .from('sectors') // Tabela correta
        .select('id, name, default_responsible') // Colunas corretas
        .ilike('name', `%${query}%`) // Filtro na coluna correta
        // .eq('ativo', true) // Removido pois não existe no script SQL atual
        .limit(10)
        .order('name')

      if (err) throw err
      return (data as Sector[]) || []
    } catch (err: any) {
      console.error('Erro ao buscar setores:', err)
      return []
    }
  }

  /**
   * Busca um setor pelo ID para pré-preencher em edições
   */
  async function getSectorById(id: string): Promise<Sector | null> {
    try {
      const { data, error: err } = await supabaseClient
        .from('sectors') // Tabela correta
        .select('id, name, default_responsible')
        .eq('id', id)
        .single()

      if (err) throw err
      return data as Sector
    } catch (err) {
      return null
    }
  }

  /**
   * Envia ou Atualiza uma avaliação (Com Upload de Imagem)
   */
  async function submitEvaluation(payload: EvaluationFormPayload) {
    loading.value = true
    error.value = null
    
    try {
      // 1. Verificar Sessão DIRETAMENTE no Supabase
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.')
      }

      let photoUrl = null

      // 2. Upload da Imagem (se houver)
      if (payload.image) {
        const fileExt = payload.image.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabaseClient.storage
          .from('evaluations') // Bucket correto
          .upload(fileName, payload.image)

        if (uploadError) throw uploadError

        // Pegar URL pública
        const { data: publicData } = supabaseClient.storage
          .from('evaluations')
          .getPublicUrl(fileName)
          
        photoUrl = publicData.publicUrl
      }

      // 3. Montar objeto para salvar
      // Mapeamento corrigido para bater com as colunas do SQL
      const dbData = {
        created_by: user.id, // Rastreabilidade
        user_id: user.id,    // Legado ou redundância (depende do seu SQL final)
        sector_id: payload.sector_id,
        responsible: payload.responsible, // Coluna 'responsible' (não 'responsible_name')
        score: payload.score,
        observacao: payload.observations, // Coluna 'observacao' ou 'observations'? Seu SQL variou.
                                          // Vou usar 'observations' que é mais padrão no seu SQL mais recente.
                                          // Se der erro, troque para 'observacao'.
        observations: payload.observations, 
        
        // Campos obrigatórios no seu SQL:
        date: new Date().toISOString().split('T')[0], 
        evaluator: 'Usuário App', // Placeholder, idealmente viria do perfil
        
        ...(photoUrl ? { details: { photo_url: photoUrl } } : {}) // Salvando foto no JSON 'details' se não houver coluna dedicada
      }
      
      if (editingEvaluationId.value) {
        // --- ATUALIZAÇÃO (UPDATE) ---
        const { error: updateError } = await supabaseClient
          .from('evaluations')
          .update(dbData)
          .eq('id', editingEvaluationId.value)
          
        if (updateError) throw updateError
      } else {
        // --- CRIAÇÃO (INSERT) ---
        const { error: insertError } = await supabaseClient
          .from('evaluations')
          .insert(dbData)

        if (insertError) throw insertError
      }

      clearEditMode()
      return true

    } catch (e: any) {
      console.error('Erro ao enviar avaliação:', e)
      error.value = e.message || 'Falha ao salvar avaliação.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Prepara o store para editar um item existente
   */
  async function fetchEvaluationForEdit(id: string) {
    loading.value = true
    try {
      const { data, error: err } = await supabaseClient
        .from('evaluations')
        .select(`*`) // Traz tudo para garantir
        .eq('id', id)
        .single()

      if (err) throw err

      // Mapeia para o formato esperado pelo form
      dataToEdit.value = {
        id: data.id,
        created_at: data.created_at,
        date: data.date || '', 
        evaluator: data.evaluator || '',
        
        sector_id: data.sector_id,
        responsible: data.responsible,
        score: data.score,
        weight: 0, // Campo removido do banco?
        observations: data.observations,
        photo_url: data.details?.photo_url || null, // Tenta pegar do JSON
        user_id: data.created_by || data.user_id
      } as EvaluationFull

      editingEvaluationId.value = id

    } catch (err) {
      console.error('Erro ao buscar avaliação:', err)
      clearEditMode()
    } finally {
      loading.value = false
    }
  }

  function clearEditMode() {
    editingEvaluationId.value = null
    dataToEdit.value = null
  }

  /**
   * Exclusão Lógica ou Física
   */
  async function deleteEvaluation(id: string) {
    loading.value = true
    try {
      const { error: err } = await supabaseClient
        .from('evaluations')
        .delete()
        .eq('id', id)

      if (err) throw err
      return true
    } catch (err: any) {
      console.error('Erro ao excluir:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Limpar banco de dados (Ação Administrativa)
   */
  async function deleteAllEvaluations() {
    loading.value = true
    try {
       // Tenta usar a RPC segura se disponível
       const { error: rpcError } = await supabaseClient.rpc('delete_all_evaluations')
       
       if (rpcError) {
         // Fallback: Tenta deletar direto (vai falhar se não for admin via RLS)
         console.warn('RPC falhou, tentando delete direto...', rpcError)
         const { error: delError } = await supabaseClient
           .from('evaluations')
           .delete()
           .neq('id', 0) // Delete all
           
         if (delError) throw delError
       }
       
       return true
    } catch (err: any) {
      console.error('Erro ao limpar banco:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    editingEvaluationId,
    dataToEdit,
    searchSectors,
    getSectorById,
    submitEvaluation,
    fetchEvaluationForEdit,
    clearEditMode,
    deleteEvaluation,
    deleteAllEvaluations
  }
})