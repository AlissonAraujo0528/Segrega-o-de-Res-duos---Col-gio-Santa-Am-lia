<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEvaluationStore, type EvaluationData } from '../stores/evaluationStore'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import KlinLogo from '../assets/KLIN.png'
import ComboboxSetor from './ComboboxSetor.vue'
import ThemeToggle from './ThemeToggle.vue'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const evaluator = ref('')
const evaluationDate = ref<string>((new Date().toISOString().split('T')[0]) as string) 
const sector = ref('')
const responsible = ref('')
const observations = ref('')
const questions = ref([
  { id: 'organicos', text: 'Sem presença de resíduos orgânicos nos recicláveis' },
  { id: 'sanitarios', text: 'Sem presença de papéis sanitários nos recicláveis' },
  { id: 'outros', text: 'Sem outros não recicláveis (Ex.: Clipes, fitas, etc.)' },
  { id: 'nivel', text: 'Nível dos coletores adequado' },
])
const answers = ref<Record<string, string>>({})
const isLoading = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const validationState = ref({
  evaluator: false,
  evaluationDate: false,
  sector: false,
  responsible: false,
  questions: false,
})

watch(() => evaluationStore.dataToEdit, (newData) => {
  if (newData) {
    evaluator.value = newData.evaluator
    evaluationDate.value = newData.date
    sector.value = newData.sector_id
    responsible.value = newData.responsible
    observations.value = newData.observations
    
    const newAnswers: Record<string, string> = {}
    questions.value.forEach(q => {
      const value = newData.details?.[q.id];
      if (value != null) { 
        newAnswers[q.id] = value.toString();
      }
    })
    answers.value = newAnswers
  }
})

const totalScore = computed(() => {
  return Object.values(answers.value).reduce((sum, val) => {
    return sum + (parseInt(val, 10) || 0)
  }, 0)
})

const today = computed(() => new Date().toISOString().split('T')[0])

function resetForm() {
  evaluator.value = ''
  sector.value = ''
  responsible.value = ''
  observations.value = ''
  answers.value = {}

  evaluationDate.value = (new Date().toISOString().split('T')[0]) as string
  validationState.value = {
    evaluator: false,
    evaluationDate: false,
    sector: false,
    responsible: false,
    questions: false,
  }
  
  evaluationStore.clearEditMode()
}

async function handleSubmit() {
  isLoading.value = true
  successMessage.value = null
  errorMessage.value = null

  validationState.value = {
    evaluator: !evaluator.value,
    evaluationDate: !evaluationDate.value,
    sector: !sector.value,
    responsible: !responsible.value,
    questions: !questions.value.every(q => !!answers.value[q.id])
  }

  const formIsValid = Object.values(validationState.value).every(isInvalid => !isInvalid)

  if (!formIsValid) {
    errorMessage.value = 'Por favor, preencha todos os campos obrigatórios (incluindo todas as perguntas).'
    isLoading.value = false
    return
  }

  const evaluationData: EvaluationData = {
    date: evaluationDate.value,
    evaluator: evaluator.value,
    sector_id: sector.value,
    score: totalScore.value,
    details: { ...answers.value },
    responsible: responsible.value,
    observations: observations.value,
  }

  try {
    const result = await evaluationStore.submitEvaluation(evaluationData) 
    const successAction = evaluationStore.editingEvaluationId ? 'atualizada' : 'enviada'
    successMessage.value = result.message || `Avaliação ${successAction} com sucesso!`
    resetForm()
  } catch (error: any) {
    errorMessage.value = error.message || 'Ocorreu um erro ao enviar.'
    uiStore.showToast(error.message, 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>

  <div class="flex min-h-screen flex-col items-center bg-bg-primary p-4 sm:p-8">
    
    <img :src="KlinLogo" alt="Logo KLIN" class="mb-5 h-auto w-40" />

    <div class="w-full max-w-4xl overflow-hidden rounded-2xl border border-border-light bg-secondary shadow-lg">
      
      <header class="border-b border-border-light bg-secondary p-5">
        
        <div class="flex justify-end gap-2">
          <ThemeToggle />

          <button
            @click="authStore.handleLogout()"
            title="Sair do sistema"
            class="rounded border border-danger px-3 py-2 text-xs text-danger outline-none transition-all 
                   hover:bg-danger hover:text-white 
                   focus-ring:ring-2 focus-ring:ring-danger/50"
          >
            <i class="fa-solid fa-right-from-bracket mr-2"></i> Sair
          </button>
        </div>
        
        <div class="mt-4 text-center">
          <div class="border-b-2 border-primary-dark pb-2 text-base font-semibold text-primary-dark">
            SISTEMA DE GESTÃO KLIN
          </div>
          <div class="mt-2 border-b-2 border-primary pb-2 text-base font-semibold text-primary sm:text-lg">
            Avaliação de Segregação de Resíduos - Braskem | Colégio Santa Amélia
          </div>
        </div>
      </header>

      <div class="p-6 sm:p-8">
        <form @submit.prevent="handleSubmit">
          
          <!-- ✅ CORREÇÃO: Adicionado 'overflow-hidden' -->
          <table class="mb-8 w-full rounded-lg border overflow-hidden">
            <thead>
              <tr>
                <th class="rounded-t-lg bg-primary-dark p-3 text-left text-white" colspan="2">
                  Critérios de Avaliação
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-light">
              <tr class="bg-secondary"><td class="p-3">😐 Segregação Regular</td><td class="p-3"><strong>2 Pontos</strong></td></tr>
              <tr class="bg-tertiary"><td class="p-3">😃 Segregação Excelente</td><td class="p-3"><strong>5 Pontos</strong></td></tr>
            </tbody>
          </table>

          <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label for="evaluator" class="mb-2 block text-sm font-medium text-text-secondary">Avaliador:</label>

              <input 
                v-model="evaluator" 
                type="text" 
                id="evaluator" 
                required 
                :aria-invalid="validationState.evaluator"
                class="w-full rounded-lg border border-border-light p-3 shadow-sm outline-none transition-all 
                       focus-ring:ring-2 focus-ring:ring-primary 
                       invalid:border-danger"
              />
            </div>
            
            <div>
              <label for="evaluation-date" class="mb-2 block text-sm font-medium text-text-secondary">Data da Avaliação:</label>

              <input 
                v-model="evaluationDate" 
                type="date" 
                id="evaluation-date" 
                :max="today" 
                required 
                :aria-invalid="validationState.evaluationDate"
                class="w-full rounded-lg border border-border-light p-3 shadow-sm outline-none transition-all 
                       focus-ring:ring-2 focus-ring:ring-primary 
                       invalid:border-danger" 
              />
            </div>
            
            <div>
              <ComboboxSetor 
                v-model="sector" 
                @update:responsible="responsible = $event"
                :is-invalid="validationState.sector"
              />
            </div>
            
            <div>
              <label for="responsible" class="mb-2 block text-sm font-medium text-text-secondary">Responsável:</label>

              <input 
                v-model="responsible" 
                type="text" 
                id="responsible" 
                required 
                :aria-invalid="validationState.responsible"
                class="w-full rounded-lg border border-border-light p-3 shadow-sm outline-none transition-all 
                       focus-ring:ring-2 focus-ring:ring-primary 
                       invalid:border-danger"
              />
            </div>
          </div>

          <h3 class="mb-6 text-center text-xl font-semibold text-text-primary">
            AVALIAÇÃO QUALITATIVA
          </h3>

          <div 
            class="mb-8 w-full overflow-x-auto rounded-lg border transition-colors"
            :class="{ 'border-danger': validationState.questions }"
          >

            <table class="min-w-full divide-y divide-border-light">
              <thead class="bg-primary-dark">
                <tr>
                  <th class="p-4 text-left text-sm font-semibold text-white">Item de Avaliação</th>
                  <th class="p-4 text-center text-lg font-semibold text-white">😐</th>
                  <th class="p-4 text-center text-lg font-semibold text-white">😃</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-light bg-secondary">
                
                <tr 
                  v-for="(question, index) in questions" 
                  :key="question.id"
                  role="radiogroup"
                  :aria-labelledby="`q-label-${index}`"
                  class="hover:bg-tertiary"
                >
                  <td :id="`q-label-${index}`" class="p-4 font-medium text-text-primary">{{ question.text }}</td>
                  
                  <td class="p-4 text-center">
                    <label :for="`${question.id}-2`" class="cursor-pointer">
                      <input 
                        type="radio" 
                        :id="`${question.id}-2`"
                        :name="question.id" 
                        value="2" 
                        v-model="answers[question.id]" 
                        class="h-5 w-5 text-primary outline-none focus-ring:ring-2 focus-ring:ring-primary"
                        required
                      />
                    </label>
                  </td>
                  
                  <td class="p-4 text-center">
                    <label :for="`${question.id}-5`" class="cursor-pointer">
                      <input 
                        type="radio" 
                        :id="`${question.id}-5`"
                        :name="question.id" 
                        value="5" 
                        v-model="answers[question.id]"
                        class="h-5 w-5 text-primary outline-none focus-ring:ring-2 focus-ring:ring-primary"
                      />
                    </label>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
          
          <div class="my-6 rounded-lg border-2 border-primary bg-tertiary p-5 text-center text-2xl font-bold text-primary-dark">
            Pontuação Total: <span class="text-primary">{{ totalScore }}</span>
          </div>

          <div class="mb-8">
            <label for="observations" class="mb-2 block text-sm font-medium text-text-secondary">Observações:</label>

            <textarea 
              v-model="observations" 
              id="observations" 
              rows="4" 
              class="w-full rounded-lg border border-border-light p-3 shadow-sm outline-none transition-all 
                     focus-ring:ring-2 focus-ring:ring-primary"
            ></textarea>
          </div>

          <div v-if="successMessage" role="status" class="mb-4 rounded-md bg-success/10 p-4 text-center text-success">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" role="alert" class="mb-4 rounded-md bg-danger/10 p-4 text-center text-danger">
            {{ errorMessage }}
          </div>

          <div class="flex flex-col gap-4 sm:flex-row">

            <button
              type="button"
              @click="resetForm"
              class="flex-1 rounded-lg bg-gray-500 px-6 py-4 text-lg font-semibold text-white shadow-md outline-none transition-all 
                     hover:bg-gray-600 
                     focus-ring:ring-2 focus-ring:ring-gray-400"
            >
              <i :class="evaluationStore.editingEvaluationId ? 'fa-solid fa-times' : 'fa-solid fa-eraser'" class="mr-2"></i>
              {{ evaluationStore.editingEvaluationId ? 'Cancelar Edição' : 'Limpar' }}
            </button>
            
            <button
              type="submit"
              :disabled="isLoading"
              class="flex-1 rounded-lg px-6 py-4 text-lg font-semibold text-white shadow-md outline-none transition-all 
                     disabled:opacity-50"
              :class="evaluationStore.editingEvaluationId 
                ? 'bg-warning hover:bg-warning/90 focus-ring:ring-2 focus-ring:ring-warning/50' 
                : 'bg-success hover:bg-success/90 focus-ring:ring-2 focus-ring:ring-success/50'"
            >
              <i v-if="isLoading" class="fa-solid fa-spinner fa-spin mr-2"></i>
              <i v-else :class="evaluationStore.editingEvaluationId ? 'fa-solid fa-floppy-disk' : 'fa-solid fa-paper-plane'" class="mr-2"></i>
              {{ isLoading ? 'Salvando...' : (evaluationStore.editingEvaluationId ? 'Atualizar Avaliação' : 'Enviar Avaliação') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="mt-6 flex w-full max-w-4xl flex-col gap-4 sm:flex-row">
      <button 
        @click="uiStore.openModal('ranking')"
        class="flex-1 rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-white shadow-md outline-none transition-all 
               hover:bg-primary-dark 
               focus-ring:ring-2 focus-ring:ring-primary/50"
      >
        Ver Ranking <i class="fa-solid fa-trophy ml-2"></i>
      </button>
      <button 
        @click="uiStore.openModal('dashboard')"
        class="flex-1 rounded-lg bg-gray-800 px-6 py-4 text-lg font-semibold text-white shadow-md outline-none transition-all 
               hover:bg-gray-900 
               focus-ring:ring-2 focus-ring:ring-gray-500"
      >
        Ver Dashboard <i class="fa-solid fa-chart-line ml-2"></i>
      </button>
      
      <button 
        v-if="authStore.userRole === 'admin'"
        @click="uiStore.openModal('admin')"
        class="flex-1 rounded-lg bg-danger px-6 py-4 text-lg font-semibold text-white shadow-md outline-none transition-all 
               hover:bg-danger/90 
               focus-ring:ring-2 focus-ring:ring-danger/50"
      >
        Ações de Admin <i class="fa-solid fa-user-shield ml-2"></i>
      </button>
    </div>

  </div>
</template>