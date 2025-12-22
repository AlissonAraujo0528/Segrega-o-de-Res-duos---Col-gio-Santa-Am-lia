<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore' // Importar a store de UI
import KlinLogo from '../assets/KLIN.png'
import { supabaseClient } from '../lib/supabaseClient' // Importar cliente para update de senha

const authStore = useAuthStore()
const uiStore = useUiStore() // Usar a store de UI

// Variáveis reativas
const email = ref('')
const password = ref('')
const newPassword = ref('') // Para a nova senha
const recoveryEmail = ref('')

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = ref(false)

// --- ACTIONS ---

async function submitLogin() {
  isLoading.value = true
  errorMessage.value = null
  try {
    await authStore.handleLogin(email.value, password.value)
    // Sucesso: O App.vue vai fechar o modal automaticamente via v-if="!userRole"
  } catch (error: any) {
    errorMessage.value = 'Email ou senha inválidos.'
  } finally {
    isLoading.value = false
  }
}

async function submitRecovery() {
  isLoading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    await authStore.handleForgotPassword(recoveryEmail.value)
    successMessage.value = 'Email de recuperação enviado! Verifique sua caixa de entrada.'
    // Opcional: Voltar para login após alguns segundos
  } catch (error: any) {
    errorMessage.value = 'Erro ao enviar. Verifique o e-mail digitado.'
  } finally {
    isLoading.value = false
  }
}

async function submitUpdatePassword() {
  isLoading.value = true
  errorMessage.value = null
  
  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword.value })
    if (error) throw error

    successMessage.value = 'Senha atualizada com sucesso!'
    
    // Reseta o estado da UI e garante o login
    setTimeout(() => {
        uiStore.isRecoveryMode = false // Libera o App.vue para esconder o modal
        uiStore.authModalMode = 'login' // Reseta para o próximo uso
        
        // Força atualização do perfil se necessário
        authStore.userRole = 'user' // Ou recarregar da base se preferir
        window.location.reload() // Recarrega para garantir estado limpo (opcional mas recomendado)
    }, 1500)

  } catch (error: any) {
    errorMessage.value = 'Erro ao atualizar senha: ' + error.message
  } finally {
    isLoading.value = false
  }
}

// --- CONTROLE DE MODO ---
// Helpers para facilitar a leitura no template
const isLoginMode = computed(() => uiStore.authModalMode === 'login')
const isForgotMode = computed(() => uiStore.authModalMode === 'register') // Usando 'register' como 'forgot' temporariamente ou crie um novo tipo
// Nota: No uiStore definimos 'login' | 'register' | 'update_password'. 
// Vamos assumir que "Esqueci a senha" é um estado visual dentro do modal ou um novo tipo.
// Para manter simples com seu código anterior, vamos mapear assim:

function setMode(mode: 'login' | 'register' | 'update_password') {
    uiStore.authModalMode = mode
    errorMessage.value = null
    successMessage.value = null
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
  >
    <div class="relative w-full max-w-md rounded-xl bg-bg-secondary border border-border-light shadow-xl overflow-hidden">

      <div class="p-8 space-y-6">
        
        <img :src="KlinLogo" alt="Logo KLIN" class="mx-auto mb-2 w-36" />

        <div v-if="uiStore.authModalMode === 'login'" class="space-y-6">
          <div class="text-center space-y-1">
            <h2 class="text-xl font-semibold text-text-primary">Segregação de Resíduos</h2>
            <p class="text-sm text-text-secondary">Braskem | Colégio Santa Amélia</p>
          </div>

          <form @submit.prevent="submitLogin" class="space-y-4">
            <div class="space-y-2">
              <label for="email" class="block text-sm font-medium text-text-secondary">Email:</label>
              <input v-model="email" id="email" type="email" required
                :aria-invalid="!!errorMessage"
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none transition-all focus-ring:ring-2 focus-ring:ring-primary invalid:border-danger"
              />
            </div>

            <div class="space-y-2">
              <label for="password" class="block text-sm font-medium text-text-secondary">Senha:</label>
              <input v-model="password" id="password" type="password" required
                :aria-invalid="!!errorMessage"
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none transition-all focus-ring:ring-2 focus-ring:ring-primary invalid:border-danger"
              />
            </div>

            <button type="submit" :disabled="isLoading"
              class="w-full rounded-lg bg-primary text-white font-semibold py-3 transition-all shadow-md hover:bg-primary-dark disabled:opacity-50 active:scale-[0.97]"
            >
              {{ isLoading ? 'Entrando...' : 'Entrar' }}
            </button>

            <p v-if="errorMessage" class="text-center text-sm text-danger">{{ errorMessage }}</p>

            <button class="block w-full text-sm text-primary hover:underline outline-none"
              @click.prevent="setMode('register')" 
            >
            Esqueci minha senha
            </button>
          </form>
        </div>

        <div v-else-if="uiStore.authModalMode === 'register'" class="space-y-6">
          <div class="text-center space-y-1">
            <h2 class="text-xl font-semibold text-text-primary">Recuperar Senha</h2>
            <p class="text-sm text-text-secondary">Digite seu e-mail para recuperação.</p>
          </div>

          <form @submit.prevent="submitRecovery" class="space-y-4">
            <div class="space-y-2">
              <label for="recovery-email" class="block text-sm font-medium text-text-secondary">Email:</label>
              <input v-model="recoveryEmail" id="recovery-email" type="email" required
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none focus-ring:ring-2 focus-ring:ring-primary"
              />
            </div>

            <button type="submit" :disabled="isLoading"
              class="w-full rounded-lg bg-success text-white font-semibold py-3 transition-all shadow-md hover:bg-success/90 disabled:opacity-50"
            >
              {{ isLoading ? 'Enviando...' : 'Enviar link' }}
            </button>

            <p v-if="errorMessage" class="text-center text-sm text-danger">{{ errorMessage }}</p>

            <button @click.prevent="setMode('login')"
              class="block w-full text-sm text-text-secondary hover:underline"
            >
              Voltar para login
            </button>
          </form>
        </div>

        <div v-else-if="uiStore.authModalMode === 'update_password'" class="space-y-6">
           <div class="text-center space-y-1">
            <h2 class="text-xl font-semibold text-text-primary">Definir Nova Senha</h2>
            <p class="text-sm text-text-secondary">Por favor, crie uma nova senha segura.</p>
          </div>

          <form @submit.prevent="submitUpdatePassword" class="space-y-4">
            <div class="space-y-2">
              <label for="new-password" class="block text-sm font-medium text-text-secondary">Nova Senha:</label>
              <input v-model="newPassword" id="new-password" type="password" required minlength="6"
                placeholder="Mínimo 6 caracteres"
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none focus-ring:ring-2 focus-ring:ring-primary"
              />
            </div>

            <button type="submit" :disabled="isLoading"
              class="w-full rounded-lg bg-primary text-white font-semibold py-3 transition-all shadow-md hover:bg-primary-dark disabled:opacity-50"
            >
              {{ isLoading ? 'Atualizando...' : 'Atualizar Senha' }}
            </button>
            
            <p v-if="errorMessage" class="text-center text-sm text-danger">{{ errorMessage }}</p>
          </form>
        </div>

        <p v-if="successMessage" class="text-center text-sm text-success font-medium bg-success/10 p-2 rounded">{{ successMessage }}</p>

      </div>

    </div>
  </div>
</template>