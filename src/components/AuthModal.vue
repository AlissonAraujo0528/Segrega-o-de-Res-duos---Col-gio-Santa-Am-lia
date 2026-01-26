<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import KlinLogo from '../assets/KLIN.png'
import { supabaseClient } from '../lib/supabaseClient'
import type { AuthError } from '@supabase/supabase-js'

const authStore = useAuthStore()
const uiStore = useUiStore()

const email = ref('')
const password = ref('')
const newPassword = ref('')
const recoveryEmail = ref('')

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = ref(false)

// Função auxiliar para extrair mensagem de erro amigável
const getFriendlyErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as AuthError).message
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
    if (msg.includes('Email not confirmed')) return 'Verifique seu email para confirmar o cadastro.'
    return msg
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

async function submitLogin() {
  if (!email.value || !password.value) return
  
  isLoading.value = true
  errorMessage.value = null
  
  try {
    const success = await authStore.handleLogin(email.value, password.value)
    if (!success) {
      // Se o store retornou false mas não jogou erro (dependendo da implementação do store)
      throw new Error('Falha ao autenticar.')
    }
    // Sucesso: O store já deve redirecionar ou fechar o modal
    uiStore.closeAuthModal()
  } catch (error) {
    console.error('Erro de Login:', error)
    errorMessage.value = getFriendlyErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

async function submitRecovery() {
  if (!recoveryEmail.value) return

  isLoading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const { error } = await authStore.handleForgotPassword(recoveryEmail.value)
    if (error) throw error
    successMessage.value = 'Email de recuperação enviado! Verifique sua caixa de entrada.'
  } catch (error) {
    errorMessage.value = getFriendlyErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

async function submitUpdatePassword() {
  if (newPassword.value.length < 6) {
    errorMessage.value = 'A senha deve ter no mínimo 6 caracteres.'
    return
  }

  isLoading.value = true
  errorMessage.value = null
  
  try {
    // 1. Atualizar Senha no Auth
    const { data: userData, error: authError } = await supabaseClient.auth.updateUser({ 
      password: newPassword.value 
    })
    
    if (authError) throw authError

    // 2. Atualizar Flag no Banco (Profile) - Opcional / Best Effort
    if (userData.user) {
      try {
        await supabaseClient
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', userData.user.id)
      } catch (profileErr) {
        console.warn('Não foi possível atualizar flag do perfil, mas a senha trocou.', profileErr)
      }
    }
    
    successMessage.value = 'Senha atualizada com sucesso! Redirecionando...'
    
    // Pequeno delay para ler a mensagem
    setTimeout(async () => {
       await authStore.completePasswordRecovery()
    }, 1000)

  } catch (error) {
    errorMessage.value = getFriendlyErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

function setMode(mode: 'login' | 'register' | 'update_password') {
  uiStore.authModalMode = mode
  errorMessage.value = null
  successMessage.value = null
  // Limpa campos ao trocar de modo
  password.value = ''
  newPassword.value = ''
}
</script>

<template>
  <div
    v-if="uiStore.isAuthModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-opacity duration-300"
    role="dialog"
    aria-modal="true"
  >
    <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100">
      
      <button 
        v-if="uiStore.authModalMode !== 'update_password'"
        @click="uiStore.closeAuthModal"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <i class="fa-solid fa-times text-xl"></i>
      </button>

      <div class="p-8">
        
        <div class="text-center mb-8">
          <img :src="KlinLogo" alt="Logo KLIN" class="h-16 mx-auto mb-4 object-contain" />
          
          <h2 class="text-2xl font-bold text-gray-800 tracking-tight">
            {{ uiStore.authModalMode === 'login' ? 'Bem-vindo de volta' : 
               uiStore.authModalMode === 'register' ? 'Recuperar Acesso' : 'Nova Senha' }}
          </h2>
          
          <p class="text-sm text-gray-500 mt-2">
            {{ uiStore.authModalMode === 'login' ? 'Gestão de Resíduos | Colégio Santa Amélia' : 
               uiStore.authModalMode === 'register' ? 'Digite seu e-mail para receber um link de redefinição.' : 
               'Defina sua nova senha de acesso.' }}
          </p>
        </div>

        <div v-if="errorMessage" class="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
          <i class="fa-solid fa-circle-exclamation text-red-500 mt-0.5"></i>
          <p class="text-sm text-red-700 font-medium">{{ errorMessage }}</p>
        </div>

        <div v-if="successMessage" class="mb-6 p-4 rounded-lg bg-green-50 border border-green-100 flex items-start gap-3">
          <i class="fa-solid fa-check-circle text-green-500 mt-0.5"></i>
          <p class="text-sm text-green-700 font-medium">{{ successMessage }}</p>
        </div>

        <form v-if="uiStore.authModalMode === 'login'" @submit.prevent="submitLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i class="fa-solid fa-envelope"></i>
              </span>
              <input 
                v-model="email" 
                type="email" 
                required 
                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i class="fa-solid fa-lock"></i>
              </span>
              <input 
                v-model="password" 
                type="password" 
                required 
                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div class="flex justify-end">
            <button type="button" @click="setMode('register')" class="text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium">
              Esqueceu a senha?
            </button>
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-lg shadow-md hover:shadow-lg focus:ring-4 focus:ring-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
            {{ isLoading ? 'Entrando...' : 'Acessar Sistema' }}
          </button>
        </form>

        <form v-else-if="uiStore.authModalMode === 'register'" @submit.prevent="submitRecovery" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">E-mail Cadastrado</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i class="fa-solid fa-envelope"></i>
              </span>
              <input 
                v-model="recoveryEmail" 
                type="email" 
                required 
                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="exemplo@braskem.com"
              />
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-lg shadow-md hover:shadow-lg focus:ring-4 focus:ring-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
            {{ isLoading ? 'Enviando...' : 'Enviar Link de Recuperação' }}
          </button>

          <button 
            type="button" 
            @click="setMode('login')"
            class="w-full py-3 px-4 bg-transparent hover:bg-gray-50 text-gray-600 font-semibold rounded-lg transition-colors border border-transparent hover:border-gray-200"
          >
            Voltar para Login
          </button>
        </form>

        <form v-else-if="uiStore.authModalMode === 'update_password'" @submit.prevent="submitUpdatePassword" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nova Senha</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i class="fa-solid fa-key"></i>
              </span>
              <input 
                v-model="newPassword" 
                type="password" 
                required 
                minlength="6"
                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1 pl-1">Escolha uma senha forte que você não esqueça.</p>
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-lg shadow-md hover:shadow-lg focus:ring-4 focus:ring-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
            {{ isLoading ? 'Salvando...' : 'Confirmar Nova Senha' }}
          </button>
        </form>

      </div>
      
      <div class="h-2 bg-gradient-to-r from-teal-400 to-teal-600 w-full"></div>
    </div>
  </div>
</template>