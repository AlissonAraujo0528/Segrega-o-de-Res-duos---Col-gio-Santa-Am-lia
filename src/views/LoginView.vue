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

// Computado para mudar o título dinamicamente com animação
const pageTitle = computed(() => viewMode.value === 'login' ? 'Bem-vindo de volta!' : 'Recuperar Acesso')
const pageSubtitle = computed(() => viewMode.value === 'login' ? 'Insira suas credenciais para acessar o painel 5S.' : 'Enviaremos um link para redefinir sua senha.')

// Alternar visibilidade da senha
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

async function handleSubmit() {
  // CORREÇÃO: showToast -> notify
  if (!email.value) return uiStore.notify('Por favor, digite seu e-mail.', 'warning')
  
  isLoading.value = true

  try {
    if (viewMode.value === 'recovery') {
      // --- FLUXO DE RECUPERAÇÃO ---
      const { error } = await authStore.handleForgotPassword(email.value)
      if (error) throw error
      
      // CORREÇÃO: showToast -> notify
      uiStore.notify('Link de recuperação enviado para seu e-mail!', 'success')
      viewMode.value = 'login' // Volta pro login automaticamente
    } else {
      // --- FLUXO DE LOGIN ---
      if (!password.value) {
        throw new Error('Por favor, digite sua senha.')
      }
      
      const success = await authStore.handleLogin(email.value, password.value)
      if (success) {
        // CORREÇÃO: showToast -> notify
        uiStore.notify(`Olá, ${authStore.user?.email?.split('@')[0]}!`, 'success')
        router.push('/dashboard') // Redirecionamento explícito
      } else {
        throw new Error('E-mail ou senha incorretos.')
      }
    }
  } catch (error: any) {
    // CORREÇÃO: showToast -> notify
    uiStore.notify(error.message || 'Ocorreu um erro inesperado.', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-white dark:bg-gray-900">
    
    <div class="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
      <img 
        src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop" 
        alt="Industrial Background" 
        class="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      
      <div class="absolute inset-0 bg-gradient-to-br from-teal-900/90 to-gray-900/90"></div>

      <div class="relative z-10 w-full flex flex-col justify-between p-12 text-white">
        <div>
          <img src="../assets/KLIN.png" alt="Klin Logo" class="h-12 w-auto bg-white/10 p-2 rounded-lg backdrop-blur-sm mb-6" />
        </div>
        
        <div class="space-y-4">
          <h1 class="text-4xl font-extrabold tracking-tight leading-tight">
            Gestão de Qualidade <br> & Ambientes Seguros
          </h1>
          <p class="text-teal-100 text-lg max-w-md">
            O Programa 5S é a base para a melhoria contínua. Mantenha o padrão de excelência da Klin.
          </p>
        </div>

        <div class="text-xs text-teal-200/60 font-mono">
          System v2.0.0 &bull; Secure Environment
        </div>
      </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-gray-50 dark:bg-gray-900">
      <div class="w-full max-w-md space-y-8">
        
        <div class="lg:hidden text-center mb-8">
          <img src="../assets/KLIN.png" alt="Klin" class="h-12 w-auto mx-auto mb-4" />
        </div>

        <div class="text-center lg:text-left space-y-2">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {{ pageTitle }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ pageSubtitle }}
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          
          <form @submit.prevent="handleSubmit" class="space-y-6 relative z-10">
            
            <div class="space-y-1">
              <label for="email" class="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">E-mail Corporativo</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-600 transition-colors">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  placeholder="ex: joao.silva@klin.com.br"
                  class="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <transition name="slide-fade">
              <div v-if="viewMode === 'login'" class="space-y-1">
                <div class="flex items-center justify-between ml-1">
                  <label for="password" class="text-sm font-semibold text-gray-700 dark:text-gray-300">Senha</label>
                  <a 
                    href="#" 
                    @click.prevent="viewMode = 'recovery'"
                    class="text-xs font-medium text-teal-600 hover:text-teal-500 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-teal-600 transition-colors">
                    <i class="fa-solid fa-lock"></i>
                  </div>
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    placeholder="••••••••"
                    class="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                  <button 
                    type="button"
                    @click="togglePassword"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer outline-none"
                  >
                    <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
                  </button>
                </div>
              </div>
            </transition>

            <div class="pt-2">
              <AppButton 
                type="submit" 
                class="w-full py-3.5 text-base shadow-lg shadow-teal-900/10 hover:shadow-teal-900/20" 
                :loading="isLoading"
              >
                {{ viewMode === 'login' ? 'Entrar no Sistema' : 'Enviar Link de Recuperação' }}
              </AppButton>
            </div>

          </form>

          <transition name="fade">
            <div v-if="viewMode === 'recovery'" class="text-center mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
              <button 
                @click="viewMode = 'login'" 
                class="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                <i class="fa-solid fa-arrow-left"></i> Voltar para Login
              </button>
            </div>
          </transition>

        </div>

        <p class="text-center text-xs text-gray-400 dark:text-gray-600">
          &copy; {{ new Date().getFullYear() }} Klin Produtos Infantis. Todos os direitos reservados.
        </p>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animações de Entrada/Saída */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>