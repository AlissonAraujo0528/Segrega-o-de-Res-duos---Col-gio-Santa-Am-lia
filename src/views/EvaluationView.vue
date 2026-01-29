<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
// Imports das Stores
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import { useEvaluationStore } from '../stores/evaluationStore'

// Componentes
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import ComboboxSetor from '../components/ComboboxSetor.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
const evaluationStore = useEvaluationStore()

const currentStep = ref(1)
const totalSteps = 4

// Inicialização: Reseta o estado da store para começar limpo
onMounted(() => {
  evaluationStore.resetState()
})

const progress = computed(() => (currentStep.value / totalSteps) * 100)

// --- Navegação ---
function nextStep() {
  if (currentStep.value < totalSteps) currentStep.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// --- Envio ---
async function handleSubmit() {
  if (!evaluationStore.currentEvaluation.sector_id) {
    uiStore.notify('Selecione um setor para continuar.', 'warning')
    return
  }
  
  // Envia usando o ID do usuário logado
  const success = await evaluationStore.submitEvaluation(authStore.user?.id || 'anon')
  
  if (success) {
    uiStore.notify('Avaliação salva com sucesso!', 'success')
    // Reset e volta para o passo 1
    evaluationStore.resetState()
    currentStep.value = 1
  }
}

// --- Upload de Foto ---
async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    await evaluationStore.uploadEvidence(input.files[0], authStore.user?.id || 'anon')
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto pb-20 animate-fade-in">
    
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <i class="fa-solid fa-clipboard-check text-teal-600"></i> Nova Auditoria
      </h2>
      
      <div class="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          class="h-full bg-teal-500 transition-all duration-500 ease-out"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      
      <div class="flex justify-between text-xs text-gray-400 mt-2 font-medium uppercase tracking-wider">
        <span :class="{'text-teal-600 font-bold': currentStep >= 1}">1. Local</span>
        <span :class="{'text-teal-600 font-bold': currentStep >= 2}">2. Senso</span>
        <span :class="{'text-teal-600 font-bold': currentStep >= 3}">3. Fotos</span>
        <span :class="{'text-teal-600 font-bold': currentStep >= 4}">4. Fim</span>
      </div>
    </div>

    <div v-show="currentStep === 1" class="space-y-6 animate-slide-in">
      <AppCard class="p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Dados do Local</h3>
        
        <div class="space-y-4">
          <ComboboxSetor 
            v-model="evaluationStore.currentEvaluation.sector_id" 
            @update:responsible="(name) => evaluationStore.currentEvaluation.responsible = name"
          />
          
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
            <input 
              v-model="evaluationStore.currentEvaluation.responsible"
              type="text" 
              class="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 outline-none transition-colors"
              placeholder="Nome do responsável"
            />
          </div>
        </div>
      </AppCard>
    </div>

    <div v-show="currentStep === 2" class="space-y-6 animate-slide-in">
      <AppCard class="p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Avaliação dos Sensos</h3>
        
        <div class="space-y-6">
          <div v-for="(label, key) in { seiri: 'Senso de Utilização', seiton: 'Senso de Organização', seiso: 'Senso de Limpeza', seiketsu: 'Senso de Padronização' }" :key="key">
            <div class="flex justify-between items-end mb-2">
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">{{ label }}</label>
              <span class="text-xs font-mono" :class="evaluationStore.currentEvaluation.scores[key] === 5 ? 'text-green-500' : 'text-gray-400'">
                {{ evaluationStore.currentEvaluation.scores[key] || 0 }} pts
              </span>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
              <button 
                v-for="score in [1, 3, 5]" 
                :key="score"
                @click="evaluationStore.currentEvaluation.scores[key] = score"
                class="py-3 rounded-lg border text-sm font-bold transition-all shadow-sm active:scale-95"
                :class="evaluationStore.currentEvaluation.scores[key] === score 
                  ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-300 dark:ring-teal-800' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-teal-400 text-gray-600 dark:text-gray-300'"
              >
                {{ score }}
              </button>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <div v-show="currentStep === 3" class="space-y-6 animate-slide-in">
      <AppCard class="p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Evidências e Detalhes</h3>
        
        <div class="space-y-4">
          <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-400 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              accept="image/*" 
              @change="handleFileUpload" 
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div v-if="evaluationStore.loading" class="text-teal-600">
              <i class="fa-solid fa-circle-notch fa-spin text-3xl"></i>
              <p class="text-sm mt-2 font-medium">Enviando imagem...</p>
            </div>
            
            <div v-else-if="evaluationStore.currentEvaluation.photo_url" class="text-green-600">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                 <i class="fa-solid fa-check text-2xl"></i>
              </div>
              <p class="font-bold">Foto anexada!</p>
              <p class="text-xs text-gray-500 mt-1">Clique para alterar</p>
            </div>
            
            <div v-else class="text-gray-400 group-hover:text-teal-600 transition-colors">
              <i class="fa-solid fa-camera text-4xl mb-3"></i>
              <p class="font-medium">Toque para adicionar foto</p>
              <p class="text-xs mt-1 opacity-70">Opcional, mas recomendado</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Observações Gerais</label>
            <textarea 
              v-model="evaluationStore.currentEvaluation.observations"
              rows="4"
              class="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
              placeholder="Descreva pontos de atenção, melhorias ou justificativas..."
            ></textarea>
          </div>
        </div>
      </AppCard>
    </div>

    <div v-show="currentStep === 4" class="space-y-6 animate-slide-in">
      <AppCard class="p-8 text-center">
        <div class="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600 dark:text-teal-400 shadow-sm">
          <i class="fa-solid fa-flag-checkered text-3xl"></i>
        </div>
        
        <h3 class="text-2xl font-bold text-gray-800 dark:text-white">Pronto para finalizar?</h3>
        <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6">
          Revise os dados abaixo antes de enviar.
        </p>
        
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-left text-sm space-y-3 border border-gray-100 dark:border-gray-700">
            <div class="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span class="text-gray-500">Setor:</span>
                <span class="font-bold truncate ml-4" :class="!evaluationStore.currentEvaluation.sector_id ? 'text-red-500' : 'text-gray-800 dark:text-white'">
                    {{ evaluationStore.currentEvaluation.sector_id ? 'Selecionado' : 'Não informado' }}
                </span>
            </div>
            <div class="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span class="text-gray-500">Responsável:</span>
                <span class="font-bold text-gray-800 dark:text-white">{{ evaluationStore.currentEvaluation.responsible || '-' }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-500">Foto Anexada:</span>
                <span class="font-bold" :class="evaluationStore.currentEvaluation.photo_url ? 'text-green-600' : 'text-gray-400'">
                    <i class="fa-solid" :class="evaluationStore.currentEvaluation.photo_url ? 'fa-check' : 'fa-minus'"></i>
                    {{ evaluationStore.currentEvaluation.photo_url ? 'Sim' : 'Não' }}
                </span>
            </div>
        </div>
      </AppCard>
    </div>

    <div class="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 z-30 md:relative md:bg-transparent md:border-none md:mt-6 md:p-0">
      <div class="max-w-2xl mx-auto flex justify-between gap-4">
        <AppButton 
          v-if="currentStep > 1" 
          variant="secondary" 
          @click="prevStep"
          class="flex-1 md:flex-none"
        >
          Voltar
        </AppButton>
        <div v-else class="flex-1 md:flex-none"></div>

        <AppButton 
          v-if="currentStep < totalSteps" 
          @click="nextStep"
          icon="fa-solid fa-arrow-right"
          class="flex-1 md:flex-none shadow-lg shadow-teal-500/20"
        >
          Próximo
        </AppButton>
        
        <AppButton 
          v-else 
          @click="handleSubmit" 
          :loading="evaluationStore.loading"
          icon="fa-solid fa-check"
          class="flex-1 md:flex-none shadow-lg shadow-teal-500/30"
        >
          Enviar Auditoria
        </AppButton>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-slide-in { animation: slideIn 0.3s ease-out; }

@keyframes fadeIn { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

@keyframes slideIn { 
  from { opacity: 0; transform: translateX(10px); } 
  to { opacity: 1; transform: translateX(0); } 
}
</style>