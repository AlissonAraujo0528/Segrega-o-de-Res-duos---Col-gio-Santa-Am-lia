<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import AppButton from '../components/ui/AppButton.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const viewMode = ref<'login' | 'recovery'>('login')

const pageTitle = computed(() => viewMode.value === 'login' ? 'Bem-vindo(a)!' : 'Recuperar Acesso')
const togglePassword = () => { showPassword.value = !showPassword.value }

async function handleSubmit() {
  if (!email.value) return uiStore.notify('Por favor, digite seu e-mail.', 'warning')
  isLoading.value = true
  try {
    if (viewMode.value === 'recovery') {
      const { error } = await authStore.handleForgotPassword(email.value)
      if (error) throw error
      uiStore.notify('Link enviado!', 'success')
      viewMode.value = 'login'
    } else {
      if (!password.value) throw new Error('Por favor, digite sua senha.')
      const success = await authStore.handleLogin(email.value, password.value)
      if (success) {
        uiStore.notify(`Olá!`, 'success')
        router.push('/')
      } else {
        throw new Error('Credenciais inválidas.')
      }
    }
  } catch (error: any) {
    uiStore.notify(error.message || 'Erro inesperado.', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-white dark:bg-gray-900">
    
    <div class="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
      <img src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=2070&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover opacity-40"/>
      <div class="absolute inset-0 bg-gradient-to-br from-teal-900/90 to-gray-900/80"></div>
      
      <div class="relative z-10 p-12 text-white flex flex-col justify-between h-full">
        <div>
           <img src="../assets/KLIN.png" class="h-12 w-auto bg-white/10 p-2 rounded-lg backdrop-blur-sm mb-6" />
        </div>
        <div>
          <h1 class="text-4xl font-extrabold mb-4">Klin Ambiental</h1>
          <p class="text-teal-100 text-lg">Coleta seletiva e gestão sustentável.</p>
        </div>
        <div class="text-xs text-teal-200/60 font-mono">
          System v2.1.0 &bull; Secure Environment
        </div>
      </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div class="w-full max-w-sm space-y-6">
        
        <div class="text-center mb-8 lg:hidden">
          <img src="../assets/KLIN.png" class="h-12 w-auto mx-auto mb-4" />
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Klin Ambiental</h2>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">{{ pageTitle }}</h2>
          
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div>
              <label class="text-xs font-bold text-gray-500 uppercase ml-1">E-mail</label>
              <input v-model="email" type="email" required placeholder="seu@email.com" class="block w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
            </div>

            <div v-if="viewMode === 'login'">
              <div class="flex justify-between ml-1 mb-1">
                <label class="text-xs font-bold text-gray-500 uppercase">Senha</label>
                <a href="#" @click.prevent="viewMode = 'recovery'" class="text-xs text-teal-600 hover:underline">Esqueceu?</a>
              </div>
              <div class="relative">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" required placeholder="••••••" class="block w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                <button type="button" @click="togglePassword" class="absolute inset-y-0 right-4 text-gray-400 flex items-center"><i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i></button>
              </div>
            </div>

            <AppButton type="submit" class="w-full py-4 text-lg shadow-lg" :loading="isLoading">
              {{ viewMode === 'login' ? 'Entrar' : 'Recuperar' }}
            </AppButton>
          </form>

          <div v-if="viewMode === 'recovery'" class="text-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
             <button @click="viewMode = 'login'" class="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors">
               <i class="fa-solid fa-arrow-left"></i> Voltar ao login
             </button>
          </div>
        </div>
        
        <p class="text-center text-xs text-gray-400 dark:text-gray-600">
          &copy; {{ new Date().getFullYear() }} Klin Produtos Infantis.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>