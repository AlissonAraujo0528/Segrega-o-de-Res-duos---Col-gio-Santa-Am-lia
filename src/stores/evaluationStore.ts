import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'

// --- Tipos (Alinhados com o Banco de Dados) ---

export interface Sector {
  id: number // bigint do banco
  name: string // mapeado da coluna 'nome'
  default_responsible?: string | null
}

// Dados para envio do formulário
export interface EvaluationFormPayload {
  sector_id: number
  responsible: string
  score: number // nota (0-5)
  weight: number // peso
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
   * Mapeia 'nome' (banco) para 'name' (frontend)
   */
  async function searchSectors(query: string): Promise<Sector[]> {
    try {
      const { data, error: err } = await supabaseClient
        .from('setores')
        .select('id, name:nome, default_responsible') // Alias nome -> name
        .ilike('nome', `%${query}%`)
        .eq('ativo', true)
        .limit(10)
        .order('nome')

      if (err) throw err
      return (data as any[]) || []
    } catch (err: any) {
      console.error('Erro ao buscar setores:', err)
      return []
    }
  }

  /**
   * Busca um setor pelo ID para pré-preencher em edições
   */
  async function getSectorById(id: string | number): Promise<Sector | null> {
    try {
      const { data, error: err } = await supabaseClient
        .from('setores')
        .select('id, name:nome, default_responsible')
        .eq('id', id)
        .single()

      if (err) throw err
      return data as any
    } catch (err) {
      // Erro silencioso (comum se ID for nulo)
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
          .from('evaluations')
          .upload(fileName, payload.image)

        if (uploadError) throw uploadError

        // Pegar URL pública
        const { data: publicData } = supabaseClient.storage
          .from('evaluations')
          .getPublicUrl(fileName)
          
        photoUrl = publicData.publicUrl
      }

      // 3. Montar objeto para salvar
      const dbData = {
        user_id: user.id,
        setor_id: payload.sector_id,
        responsible_name: payload.responsible,
        nota: payload.score,
        peso: payload.weight,
        observacao: payload.observations,
        ...(photoUrl ? { foto_url: photoUrl } : {}) 
      }
      
      if (editingEvaluationId.value) {
        // --- ATUALIZAÇÃO (UPDATE) ---
        const { error: updateError } = await supabaseClient
          .from('avaliacoes')
          .update(dbData)
          .eq('id', editingEvaluationId.value)
          
        if (updateError) throw updateError
      } else {
        // --- CRIAÇÃO (INSERT) ---
        const { error: insertError } = await supabaseClient
          .from('avaliacoes')
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
        .from('avaliacoes')
        .select(`
          id, 
          created_at,
          setor_id,
          responsible_name,
          nota,
          peso,
          observacao,
          foto_url,
          user_id
        `)
        .eq('id', id)
        .single()

      if (err) throw err

      // Mapeia para o formato esperado pelo form
      dataToEdit.value = {
        id: data.id,
        created_at: data.created_at,
        // Preenche campos auxiliares para o formulário não falhar
        date: data.created_at ? data.created_at.split('T')[0] : '', 
        evaluator: '', // O nome do avaliador não está nesta tabela, deixa vazio para o user preencher se quiser
        
        sector_id: data.setor_id,
        responsible: data.responsible_name,
        score: data.nota,
        weight: data.peso,
        observations: data.observacao,
        photo_url: data.foto_url,
        user_id: data.user_id
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
   * Exclusão Lógica
   */
  async function deleteEvaluation(id: string) {
    loading.value = true
    try {
      const { error: err } = await supabaseClient
        .from('avaliacoes')
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
   * Resolve o erro do AdminModal
   */
  async function deleteAllEvaluations() {
    loading.value = true
    try {
       // Deleta todos os registros onde o ID não é nulo (ou seja, tudo)
       // Isso requer que a Policy no Supabase permita DELETE para o usuário admin
       const { error: err } = await supabaseClient
         .from('avaliacoes')
         .delete()
         .neq('id', '00000000-0000-0000-0000-000000000000') 
       
       if (err) throw err
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