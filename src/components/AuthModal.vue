<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import AppButton from './ui/AppButton.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

const email = ref('')
const password = ref('')
const newPassword = ref('')
const isLoading = ref(false)

const close = () => uiStore.closeAllModals()

const mode = computed(() => uiStore.authModalMode)

// Títulos dinâmicos CORRIGIDOS
const title = computed(() => {
  if (mode.value === 'login') {
    // Só diz "Sessão Expirada" se já existia usuário logado antes
    return authStore.user ? 'Sessão Expirada' : 'Acesso ao Sistema'
  }
  if (mode.value === 'register') return 'Recuperar Acesso'
  if (mode.value === 'update_password') return 'Definir Nova Senha'
  return 'Autenticação'
})

const subtitle = computed(() => {
  if (mode.value === 'login') return 'Insira suas credenciais para continuar.'
  if (mode.value === 'register') return 'Enviaremos um link para seu e-mail.'
  if (mode.value === 'update_password') return 'Crie uma nova senha segura.'
  return ''
})

async function handleSubmit() {
  isLoading.value = true
  try {
    if (mode.value === 'login') {
      if (!email.value || !password.value) throw new Error('Preencha e-mail e senha.')
      
      const success = await authStore.handleLogin(email.value, password.value)
      
      if (success) {
        uiStore.notify('Login realizado com sucesso!', 'success')
        close() // Fecha o modal ao logar
      } else {
        throw new Error('Credenciais inválidas.')
      }
    } 
    
    else if (mode.value === 'register') { 
      if (!email.value) throw new Error('Digite seu e-mail.')
      const { error } = await authStore.handleForgotPassword(email.value)
      if (error) throw error
      uiStore.notify('E-mail enviado! Verifique sua caixa de entrada.', 'success')
      close()
    }
    
    else if (mode.value === 'update_password') {
      if (newPassword.value.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.')
      await authStore.completePasswordRecovery()
    }
  } catch (error: any) {
    console.error('Erro no AuthModal:', error)
    uiStore.notify(error.message || 'Ocorreu um erro.', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="uiStore.modals.auth" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
    
    <div class="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in relative">
      
      <button 
        @click="close"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>

      <div class="px-8 pt-8 pb-6 text-center">
        <div class="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600 dark:text-teal-400">
          <i v-if="mode === 'login'" class="fa-solid fa-right-to-bracket text-2xl"></i>
          <i v-else-if="mode === 'register'" class="fa-solid fa-life-ring text-2xl"></i>
          <i v-else class="fa-solid fa-key text-2xl"></i>
        </div>
        
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">{{ title }}</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">{{ subtitle }}</p>
      </div>

      <div class="px-8 pb-8">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          
          <div v-if="mode === 'login' || mode === 'register'" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
              <input v-model="email" type="email" required class="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
            </div>
            
            <div v-if="mode === 'login'">
              <div class="flex justify-between mb-1">
                <label class="block text-xs font-bold text-gray-500 uppercase">Senha</label>
                <button type="button" @click="uiStore.authModalMode = 'register'" class="text-xs text-teal-600 hover:underline">Esqueceu?</button>
              </div>
              <input v-model="password" type="password" required class="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
            </div>
          </div>

          <div v-if="mode === 'update_password'">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
            <input v-model="newPassword" type="password" required minlength="6" placeholder="Mínimo 6 caracteres" class="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
          </div>

          <AppButton 
            type="submit" 
            class="w-full py-3 text-base shadow-lg shadow-teal-500/20" 
            :loading="isLoading"
          >
            {{ mode === 'login' ? 'Entrar' : 'Confirmar' }}
          </AppButton>

          <div v-if="mode === 'register'" class="text-center pt-2">
            <button type="button" @click="uiStore.authModalMode = 'login'" class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              Voltar para Login
            </button>
          </div>

        </form>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>