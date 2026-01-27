import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'

// --- TIPOS ---

export interface Sector {
  id: string 
  name: string
  default_responsible?: string | null
}

export interface EvaluationFormPayload {
  sector_id: string
  responsible: string
  score: number
  weight: number
  observations?: string
  image?: File | null
}

// Interface completa do registro no banco
export interface EvaluationRecord {
  id: string
  created_at: string
  user_id: string
  sector_id: string
  responsible: string
  score: number
  observations?: string
  details?: { photo_url?: string } | null // Campo JSONB para flexibilidade
  date?: string
  evaluator?: string
}

// Interface para edição (Front-end)
export interface EvaluationFull extends EvaluationFormPayload {
  id: string
  user_id: string
  photo_url: string | null
  created_at: string
  date?: string
  evaluator?: string
}

export const useEvaluationStore = defineStore('evaluation', () => {
  
  // --- STATE ---
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const editingEvaluationId = ref<string | null>(null)
  const dataToEdit = ref<EvaluationFull | null>(null)

  // --- ACTIONS ---

  /**
   * Busca setores para o Combobox
   */
  async function searchSectors(query: string): Promise<Sector[]> {
    try {
      // Se a query for muito curta, retorna vazio para economizar banda
      if (query.length < 1) return []

      const { data, error: err } = await supabaseClient
        .from('sectors')
        .select('id, name, default_responsible')
        .ilike('name', `%${query}%`)
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
   * Busca setor por ID (para edição)
   */
  async function getSectorById(id: string): Promise<Sector | null> {
    try {
      const { data, error: err } = await supabaseClient
        .from('sectors')
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
   * Helper privado para upload de imagem
   */
  async function uploadEvidence(file: File, userId: string): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop()
      // Nome único: userID/timestamp.ext
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabaseClient.storage
        .from('evaluations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data } = supabaseClient.storage
        .from('evaluations')
        .getPublicUrl(fileName)
        
      return data.publicUrl
    } catch (e) {
      console.error('Erro no upload:', e)
      throw new Error('Falha ao enviar a foto. Tente novamente.')
    }
  }

  /**
   * Salvar Avaliação (Insert ou Update)
   */
  async function submitEvaluation(payload: EvaluationFormPayload) {
    loading.value = true
    error.value = null
    
    try {
      // 1. Auth Check
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) throw new Error('Sessão expirada.')

      // 2. Upload (se houver nova imagem)
      let photoUrl = null
      if (payload.image) {
        photoUrl = await uploadEvidence(payload.image, user.id)
      }

      // 3. Preparar Payload do Banco
      // Se for edição e não teve upload novo, mantemos a URL antiga (se existir)
      let finalPhotoUrl = photoUrl
      if (!photoUrl && editingEvaluationId.value && dataToEdit.value?.photo_url) {
        finalPhotoUrl = dataToEdit.value.photo_url
      }

      const dbData = {
        user_id: user.id, // Vínculo com auth.users
        sector_id: payload.sector_id,
        responsible: payload.responsible,
        score: payload.score,
        observations: payload.observations,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        evaluator: user.email?.split('@')[0] || 'Avaliador', // Fallback visual
        
        // Salva a URL da foto dentro do JSONB 'details' para flexibilidade
        details: finalPhotoUrl ? { photo_url: finalPhotoUrl } : null
      }
      
      if (editingEvaluationId.value) {
        // --- UPDATE ---
        const { error: updateError } = await supabaseClient
          .from('evaluations')
          .update(dbData)
          .eq('id', editingEvaluationId.value)
          
        if (updateError) throw updateError
      } else {
        // --- INSERT ---
        // Adiciona created_by apenas na criação (para log de auditoria imutável)
        const insertData = { ...dbData, created_by: user.id }
        const { error: insertError } = await supabaseClient
          .from('evaluations')
          .insert(insertData)

        if (insertError) throw insertError
      }

      clearEditMode()
      return true

    } catch (e: any) {
      console.error('Submit Error:', e)
      error.value = e.message || 'Erro ao salvar avaliação.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Prepara edição
   */
  async function fetchEvaluationForEdit(id: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabaseClient
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single()

      if (err) throw err

      // Extração segura da URL da foto (pode estar no JSONB details ou coluna antiga)
      const photoUrl = data.details?.photo_url || data.photo_url || null

      dataToEdit.value = {
        id: data.id,
        created_at: data.created_at,
        date: data.date,
        evaluator: data.evaluator,
        user_id: data.user_id,
        
        sector_id: data.sector_id,
        responsible: data.responsible,
        score: data.score,
        weight: 0,
        observations: data.observations,
        image: null, // Input de arquivo começa vazio na edição
        photo_url: photoUrl
      }

      editingEvaluationId.value = id

    } catch (err: any) {
      console.error('Erro fetch edit:', err)
      error.value = "Erro ao carregar dados para edição."
      clearEditMode()
    } finally {
      loading.value = false
    }
  }

  function clearEditMode() {
    editingEvaluationId.value = null
    dataToEdit.value = null
    error.value = null
  }

  /**
   * Deletar Avaliação Única
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
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Deletar TUDO (Admin)
   */
  async function deleteAllEvaluations() {
    loading.value = true
    try {
       // Tenta RPC primeiro (mais seguro/rápido se configurado)
       const { error: rpcError } = await supabaseClient.rpc('delete_all_evaluations')
       
       if (!rpcError) return true

       // Fallback: Delete manual (depende de RLS permitir)
       console.warn('Fallback delete...', rpcError)
       const { error: delError } = await supabaseClient
         .from('evaluations')
         .delete()
         .neq('id', '00000000-0000-0000-0000-000000000000') // UUID trick para "todos"
       
       if (delError) throw delError
       return true
    } catch (err: any) {
      error.value = "Falha ao limpar banco de dados."
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    error,
    editingEvaluationId,
    dataToEdit,
    
    // Actions
    searchSectors,
    getSectorById,
    submitEvaluation,
    fetchEvaluationForEdit,
    clearEditMode,
    deleteEvaluation,
    deleteAllEvaluations
  }
})