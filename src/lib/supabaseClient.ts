import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação crítica de segurança e configuração
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro Crítico: Variáveis de ambiente do Supabase ausentes.')
  throw new Error('Configuração do Supabase inválida.')
}

// Singleton do cliente
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)