<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useEvaluationStore, type EvaluationFormPayload } from '../stores/evaluationStore'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import KlinLogo from '../assets/KLIN.png'
import ComboboxSetor from './ComboboxSetor.vue'
import ThemeToggle from './ThemeToggle.vue'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

// --- Estado do Formulário ---
const form = reactive({
  evaluator: '',
  date: new Date().toISOString().split('T')[0],
  sectorId: null as number | null,
  responsible: '',
  observations: '',
  image: null as File | null
})

// Perguntas fixas (poderiam vir do banco no futuro)
const questions = [
  { id: 'organicos', text: 'Sem presença de resíduos orgânicos nos recicláveis' },
  { id: 'sanitarios', text: 'Sem presença de papéis sanitários nos recicláveis' },
  { id: 'outros', text: 'Sem outros não recicláveis (Ex.: Clipes, fitas, etc.)' },
  { id: 'nivel', text: 'Nível dos coletores adequado' },
]

// Respostas reativas
const answers = reactive<Record<string, string>>({})

// Estado local de UI
const successMessage = ref<string | null>(null)
const imagePreview = ref<string | null>(null)

// --- Computed Properties ---
const totalScore = computed(() => {
  return Object.values(answers).reduce((sum, val) => sum + (parseInt(val) || 0), 0)
})

const isFormValid = computed(() => {
  const allQuestionsAnswered = questions.every(q => !!answers[q.id])
  return form.evaluator && form.date && form.sectorId && form.responsible && allQuestionsAnswered
})

const today = new Date().toISOString().split('T')[0]

// --- Watchers e Efeitos ---

// Preencher formulário ao editar
watch(() => evaluationStore.dataToEdit, (newData) => {
  if (newData) {
    form.evaluator = newData.evaluator
    form.date = newData.date // Data já vem formatada do banco ou precisa ajustar?
    form.sectorId = newData.sector_id
    form.responsible = newData.responsible
    form.observations = newData.observations || ''
    
    // Resetar respostas antigas
    Object.keys(answers).forEach(k => delete answers[k])
    
    // Preencher novas (se o banco salvar JSON em 'details', ajuste aqui. 
    // Como simplificamos para nota única no banco, talvez você queira salvar o JSON em 'observacao' ou uma coluna extra 'details')
    // Assumindo que a nota total é o que importa para o banco agora:
    // Se precisar reconstruir as respostas individuais a partir da nota total, é complexo. 
    // Sugestão: Apenas exiba a nota total na edição ou adicione coluna JSONB 'details' no banco.
  }
})

// --- Ações ---

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    form.image = file
    
    // Preview
    const reader = new FileReader()
    reader.onload = (e) => imagePreview.value = e.target?.result as string
    reader.readAsDataURL(file)
  }
}

function resetForm() {
  form.evaluator = ''
  form.sectorId = null
  form.responsible = ''
  form.observations = ''
  form.image = null
  form.date = today
  imagePreview.value = null
  
  Object.keys(answers).forEach(k => delete answers[k])
  successMessage.value = null
  
  evaluationStore.clearEditMode()
}

async function handleSubmit() {
  if (!isFormValid.value) {
    uiStore.showToast('Preencha todos os campos obrigatórios.', 'error')
    return
  }

  const payload: EvaluationFormPayload = {
    sector_id: form.sectorId!,
    responsible: form.responsible,
    score: totalScore.value,
    weight: 0, // Peso zero por padrão se não tiver balança
    observations: JSON.stringify(answers) + '\n\n' + form.observations, // Salvando detalhes no texto por enquanto
    image: form.image
  }

  const success = await evaluationStore.submitEvaluation(payload)

  if (success) {
    const action = evaluationStore.editingEvaluationId ? 'atualizada' : 'registrada'
    successMessage.value = `Avaliação ${action} com sucesso!`
    uiStore.showToast(successMessage.value, 'success')
    resetForm()
    
    // Remove mensagem após 3s
    setTimeout(() => successMessage.value = null, 3000)
  } else {
    uiStore.showToast(evaluationStore.error || 'Erro ao salvar.', 'error')
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center bg-gray-50 p-4 sm:p-8 font-sans">
    
    <img :src="KlinLogo" alt="Logo KLIN" class="mb-6 h-auto w-32 sm:w-40 drop-shadow-sm transition-transform hover:scale-105" />

    <div class="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      
      <header class="border-b border-gray-100 bg-white p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl sm:text-2xl font-bold text-teal-700">Sistema de Gestão de Resíduos</h1>
          <div class="flex gap-2">
            <ThemeToggle />
            <button
              @click="authStore.handleLogout()"
              class="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <i class="fa-solid fa-right-from-bracket"></i> Sair
            </button>
          </div>
        </div>
        <p class="text-sm text-gray-500 text-center uppercase tracking-wide">Avaliação de Segregação - Braskem | Colégio Santa Amélia</p>
      </header>

      <div class="p-6 sm:p-8">
        <form @submit.prevent="handleSubmit" class="space-y-8">
          
          <div class="rounded-lg border border-gray-200 overflow-hidden">
            <div class="bg-gray-50 p-3 text-sm font-semibold text-gray-700 border-b border-gray-200">
              Critérios de Pontuação
            </div>
            <div class="grid grid-cols-2 text-sm">
              <div class="p-3 border-r border-gray-100 flex justify-between items-center bg-yellow-50/50">
                <span>😐 Regular</span>
                <span class="font-bold text-yellow-700">2 pts</span>
              </div>
              <div class="p-3 flex justify-between items-center bg-green-50/50">
                <span>😃 Excelente</span>
                <span class="font-bold text-green-700">5 pts</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Avaliador</label>
              <input 
                v-model="form.evaluator" 
                type="text" 
                required
                class="w-full rounded-lg border border-gray-300 p-3 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
            
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Data</label>
              <input 
                v-model="form.date" 
                type="date" 
                :max="today" 
                required
                class="w-full rounded-lg border border-gray-300 p-3 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
              />
            </div>
            
            <div class="md:col-span-1">
              <ComboboxSetor 
                v-model="form.sectorId" 
                @update:responsible="(name) => form.responsible = name"
              />
            </div>
            
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Responsável pelo Setor</label>
              <input 
                v-model="form.responsible" 
                type="text" 
                required
                class="w-full rounded-lg border border-gray-300 p-3 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all bg-gray-50"
              />
            </div>
          </div>

          <div>
            <h3 class="mb-4 text-lg font-bold text-gray-800 border-l-4 border-teal-500 pl-3">Itens de Avaliação</h3>
            
            <div class="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Avaliação</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="q in questions" :key="q.id" class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 text-sm text-gray-900 font-medium">{{ q.text }}</td>
                    <td class="px-6 py-4">
                      <div class="flex justify-center gap-4">
                        <label class="cursor-pointer group flex flex-col items-center">
                          <input type="radio" :name="q.id" value="2" v-model="answers[q.id]" class="sr-only peer" required>
                          <span class="text-2xl grayscale opacity-50 peer-checked:grayscale-0 peer-checked:opacity-100 peer-checked:scale-125 transition-all">😐</span>
                        </label>
                        <label class="cursor-pointer group flex flex-col items-center">
                          <input type="radio" :name="q.id" value="5" v-model="answers[q.id]" class="sr-only peer" required>
                          <span class="text-2xl grayscale opacity-50 peer-checked:grayscale-0 peer-checked:opacity-100 peer-checked:scale-125 transition-all">😃</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Evidência Fotográfica (Opcional)</label>
              <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-teal-500 transition-colors bg-gray-50">
                <div class="space-y-1 text-center">
                  <div v-if="!imagePreview">
                    <i class="fa-solid fa-camera text-gray-400 text-3xl mb-3"></i>
                    <div class="flex text-sm text-gray-600 justify-center">
                      <label for="file-upload" class="relative cursor-pointer rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none">
                        <span>Carregar uma foto</span>
                        <input id="file-upload" name="file-upload" type="file" class="sr-only" accept="image/*" @change="handleImageUpload">
                      </label>
                    </div>
                  </div>
                  <div v-else class="relative">
                    <img :src="imagePreview" class="max-h-40 rounded shadow-sm mx-auto" />
                    <button type="button" @click="imagePreview = null; form.image = null" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs shadow-md">
                      <i class="fa-solid fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-teal-50 rounded-xl p-6 border border-teal-100 flex flex-col items-center justify-center h-full">
              <span class="text-sm font-semibold text-teal-800 uppercase tracking-wider mb-2">Pontuação Atingida</span>
              <div class="text-5xl font-extrabold text-teal-600">{{ totalScore }}</div>
              <span class="text-xs text-teal-600/70 mt-1">de 20 pontos possíveis</span>
            </div>
          </div>

          <div>
            <label for="observations" class="mb-1.5 block text-sm font-medium text-gray-700">Observações Gerais</label>
            <textarea 
              v-model="form.observations" 
              id="observations" 
              rows="3" 
              class="w-full rounded-lg border border-gray-300 p-3 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-none"
              placeholder="Algum comentário adicional sobre a coleta ou segregação..."
            ></textarea>
          </div>

          <div v-if="successMessage" class="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200 flex items-center gap-3">
            <i class="fa-solid fa-check-circle"></i> {{ successMessage }}
          </div>
          <div v-if="evaluationStore.error" class="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-3">
            <i class="fa-solid fa-triangle-exclamation"></i> {{ evaluationStore.error }}
          </div>

          <div class="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              @click="resetForm" 
              class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all flex justify-center items-center gap-2"
              :disabled="evaluationStore.loading"
            >
              <i class="fa-solid fa-eraser"></i>
              {{ evaluationStore.editingEvaluationId ? 'Cancelar' : 'Limpar' }}
            </button>
            
            <button 
              type="submit" 
              class="flex-[2] px-6 py-3 bg-teal-600 text-white font-bold rounded-lg shadow-md hover:bg-teal-700 focus:ring-4 focus:ring-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
              :disabled="evaluationStore.loading"
            >
              <span v-if="evaluationStore.loading" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              <i v-else :class="evaluationStore.editingEvaluationId ? 'fa-solid fa-floppy-disk' : 'fa-solid fa-paper-plane'"></i>
              
              {{ evaluationStore.loading ? 'Processando...' : (evaluationStore.editingEvaluationId ? 'Salvar Alterações' : 'Enviar Avaliação') }}
            </button>
          </div>

        </form>
      </div>
    </div>

    <div class="mt-8 grid w-full max-w-4xl grid-cols-1 sm:grid-cols-3 gap-4">
      <button @click="uiStore.openModal('ranking')" class="group p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-500 transition-all text-left">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center"><i class="fa-solid fa-trophy"></i></div>
          <span class="font-bold text-gray-700 group-hover:text-teal-700">Ranking</span>
        </div>
        <p class="text-xs text-gray-500">Visualize as melhores áreas</p>
      </button>

      <button @click="uiStore.openModal('dashboard')" class="group p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all text-left">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><i class="fa-solid fa-chart-pie"></i></div>
          <span class="font-bold text-gray-700 group-hover:text-blue-700">Dashboard</span>
        </div>
        <p class="text-xs text-gray-500">Métricas e gráficos gerais</p>
      </button>

      <button v-if="authStore.userRole === 'admin'" @click="uiStore.openModal('admin')" class="group p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-500 transition-all text-left">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><i class="fa-solid fa-cog"></i></div>
          <span class="font-bold text-gray-700 group-hover:text-purple-700">Administração</span>
        </div>
        <p class="text-xs text-gray-500">Gestão do sistema</p>
      </button>
    </div>

  </div>
</template>