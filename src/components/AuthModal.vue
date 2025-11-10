<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import KlinLogo from '../assets/KLIN.png'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const recoveryEmail = ref('')
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = ref(false)
const isRecoverView = ref(false)

async function submitLogin() {
  isLoading.value = true
  errorMessage.value = null
  try {
    await authStore.handleLogin(email.value, password.value)
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
    isRecoverView.value = false
  } catch (error: any) {
    errorMessage.value = 'Erro ao enviar. Verifique o e-mail digitado.'
  } finally {
    isLoading.value = false
  }
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

        <div v-if="!isRecoverView" class="space-y-6">
          <div class="text-center space-y-1">
            <h2 class="text-xl font-semibold text-text-primary">Segregação de Resíduos</h2>
            <p class="text-sm text-text-secondary">Braskem | Colégio Santa Amélia</p>
          </div>

          <form @submit.prevent="submitLogin" class="space-y-4">

            <div class="space-y-2">
              <label for="email" class="block text-sm font-medium text-text-secondary">Email:</label>
              <input
                v-model="email"
                id="email"
                type="email"
                required
                :aria-invalid="!!errorMessage"
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none transition-all focus-ring:ring-2 focus-ring:ring-primary invalid:border-danger"
              />
            </div>

            <div class="space-y-2">
              <label for="password" class="block text-sm font-medium text-text-secondary">Senha:</label>
              <input
                v-model="password"
                id="password"
                type="password"
                required
                :aria-invalid="!!errorMessage"
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none transition-all focus-ring:ring-2 focus-ring:ring-primary invalid:border-danger"
              />
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full rounded-lg bg-primary text-white font-semibold py-3 transition-all shadow-md 
                     hover:bg-primary-dark focus-ring:ring-2 focus-ring:ring-primary/60 
                     disabled:opacity-50 active:scale-[0.97]"
            >
              {{ isLoading ? 'Entrando...' : 'Entrar' }}
            </button>

            <p v-if="errorMessage" class="text-center text-sm text-danger">{{ errorMessage }}</p>

            <button
              class="block w-full text-sm text-primary hover:underline outline-none focus-ring:ring-2 focus-ring:ring-primary/50 rounded-sm"
              @click.prevent="isRecoverView = true"
            >
              Esqueci minha senha
            </button>
          </form>
        </div>

        <div v-else class="space-y-6">
          <div class="text-center space-y-1">
            <h2 class="text-xl font-semibold text-text-primary">Recuperar Senha</h2>
            <p class="text-sm text-text-secondary">Digite seu e-mail para recuperação.</p>
          </div>

          <form @submit.prevent="submitRecovery" class="space-y-4">

            <div class="space-y-2">
              <label for="recovery-email" class="block text-sm font-medium text-text-secondary">Email:</label>
              <input
                v-model="recoveryEmail"
                id="recovery-email"
                type="email"
                required
                :aria-invalid="!!errorMessage"
                class="w-full rounded-lg border border-border-light bg-bg-primary text-text-primary p-3 shadow-sm outline-none transition-all focus-ring:ring-2 focus-ring:ring-primary invalid:border-danger"
              />
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full rounded-lg bg-success text-white font-semibold py-3 transition-all shadow-md 
                     hover:bg-success/90 focus-ring:ring-2 focus-ring:ring-success/60 
                     disabled:opacity-50 active:scale-[0.97]"
            >
              {{ isLoading ? 'Enviando...' : 'Enviar link' }}
            </button>

            <p v-if="errorMessage" class="text-center text-sm text-danger">{{ errorMessage }}</p>

            <button
              @click.prevent="isRecoverView = false"
              class="block w-full text-sm text-text-secondary hover:underline outline-none focus-ring:ring-2 focus-ring:ring-primary/50 rounded-sm"
            >
              Voltar para login
            </button>
          </form>
        </div>

        <p v-if="successMessage" class="text-center text-sm text-success">{{ successMessage }}</p>

      </div>

    </div>
  </div>
</template>