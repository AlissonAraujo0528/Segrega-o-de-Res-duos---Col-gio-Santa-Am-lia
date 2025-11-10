// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

// 1. Lê as chaves do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// 2. Validação (COMENTE OU REMOVA ESTAS LINHAS TEMPORARIAMENTE)
/*
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL ou Key não encontradas no .env");
}
*/

// 3. Cria e exporta o client
export const supabaseClient = createClient(supabaseUrl, supabaseKey)