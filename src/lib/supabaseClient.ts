import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação crítica de segurança e configuração
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro Crítico: Variáveis de ambiente do Supabase ausentes.')
  console.error('Verifique se o arquivo .env existe e contém VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY')
  throw new Error('Configuração do Supabase inválida. Veja o console para detalhes.')
}

// Singleton do cliente
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)