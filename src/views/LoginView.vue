<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
// AppButton removido pois não é usado aqui

const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const viewMode = ref<'login' | 'recovery'>('login')

const pageTitle = computed(() => viewMode.value === 'login' ? 'Bem-vindo' : 'Recuperar Senha')
const togglePassword = () => { showPassword.value = !showPassword.value }

async function handleSubmit() {
  if (!email.value) return uiStore.notify('Digite seu e-mail.', 'warning')
  isLoading.value = true
  try {
    if (viewMode.value === 'recovery') {
      const { error } = await authStore.handleForgotPassword(email.value)
      if (error) throw error
      uiStore.notify('Link enviado para o e-mail!', 'success')
      viewMode.value = 'login'
    } else {
      if (!password.value) throw new Error('Digite sua senha.')
      const success = await authStore.handleLogin(email.value, password.value)
      if (success) {
        uiStore.notify(`Olá, ${authStore.user?.email?.split('@')[0]}!`, 'success')
        router.push('/')
      } else {
        throw new Error('E-mail ou senha incorretos.')
      }
    }
  } catch (error: any) {
    uiStore.notify(error.message || 'Erro ao entrar.', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-teal-800 via-sky-900 to-slate-900 relative overflow-hidden">
    
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-lg bg-white/95 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-scale-in">
      
      <div class="p-8 sm:p-10">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-2xl mb-4 shadow-inner">
             <img src="../assets/KLIN.png" alt="Klin" class="h-10 w-auto opacity-90" />
          </div>
          <h1 class="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{{ pageTitle }}</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {{ viewMode === 'login' ? 'Gestão Ambiental & Coleta Seletiva' : 'Digite seu e-mail para receber o link.' }}
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <div class="space-y-4">
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-600 transition-colors">
                <i class="fa-solid fa-envelope text-lg"></i>
              </div>
              <input 
                v-model="email" 
                type="email" 
                required 
                placeholder="E-mail corporativo" 
                class="block w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium"
              />
            </div>

            <div v-if="viewMode === 'login'" class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-600 transition-colors">
                <i class="fa-solid fa-lock text-lg"></i>
              </div>
              <input 
                v-model="password" 
                :type="showPassword ? 'text' : 'password'" 
                required 
                placeholder="Sua senha" 
                class="block w-full pl-12 pr-12 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium"
              />
              <button 
                type="button" 
                @click="togglePassword" 
                class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-teal-600 transition-colors cursor-pointer"
              >
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full py-4 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-lg shadow-lg shadow-teal-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
            <span>{{ viewMode === 'login' ? 'Entrar no Sistema' : 'Enviar Link de Recuperação' }}</span>
          </button>
        </form>

        <div class="mt-8 text-center">
          <button 
            v-if="viewMode === 'login'"
            @click="viewMode = 'recovery'" 
            class="text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors"
          >
            Esqueceu sua senha?
          </button>
          <button 
            v-else
            @click="viewMode = 'login'" 
            class="text-sm font-bold text-teal-600 hover:text-teal-500 flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <i class="fa-solid fa-arrow-left"></i> Voltar ao Login
          </button>
        </div>

      </div>
      
      <div class="h-2 w-full bg-gradient-to-r from-teal-500 via-sky-500 to-blue-600"></div>
    </div>

    <div class="absolute bottom-4 text-center w-full">
      <p class="text-xs text-white/40 font-medium">
        &copy; {{ new Date().getFullYear() }} Klin Produtos Infantis. Ambiente Seguro.
      </p>
    </div>

  </div>
</template>

<style scoped>
.animate-scale-in { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>