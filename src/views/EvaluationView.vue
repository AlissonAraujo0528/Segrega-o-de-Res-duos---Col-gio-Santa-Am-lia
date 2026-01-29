<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useEvaluationStore } from '../stores/evaluationStore'
import { useUiStore } from '../stores/uiStore'

// Componentes
import AppButton from '../components/ui/AppButton.vue'
import AppCard from '../components/ui/AppCard.vue'
import ComboboxSetor from '../components/ComboboxSetor.vue'

const store = useEvaluationStore()
const ui = useUiStore()

// --- Configurações do Cliente ---
const questions = [
  { id: 'organicos', text: 'Sem resíduos orgânicos nos recicláveis?' },
  { id: 'sanitarios', text: 'Sem papéis sanitários nos recicláveis?' },
  { id: 'outros', text: 'Sem não-recicláveis (clipes, fitas)?' },
  { id: 'nivel', text: 'Nível dos coletores está adequado?' },
]

// --- Estado Local do Formulário ---
const form = reactive({
  sectorId: '' as string,
  responsible: '',
  date: new Date().toISOString().split('T')[0],
  observations: '',
  image: null as File | null
})

// Armazena as respostas: chave = id da pergunta, valor = nota (0, 2, 5 etc)
const answers = reactive<Record<string, number>>({})
const imagePreview = ref<string | null>(null)

// --- Lógica de Carregamento para Edição ---
onMounted(() => {
  // Se a store tiver dados carregados (veio do botão editar do ranking)
  if (store.editingId && store.currentEvaluation) {
    const data = store.currentEvaluation;
    
    // Preenche dados básicos
    form.sectorId = data.sector_id;
    form.responsible = data.responsible;
    
    // Tenta recuperar a foto
    if (data.details?.photo_url) {
      imagePreview.value = data.details.photo_url;
    }

    // Parse inteligente das observações para tentar recuperar as notas
    // O texto salvo é tipo: "Sem resíduos: OK\nObs Adicional: teste"
    if (data.observations) {
      // Separa obs do usuário do checklist automático
      const parts = data.observations.split('\n\nObs Adicional: ');
      if (parts.length > 1) {
        form.observations = parts[1]; // Restaura o texto digitado
      } else {
        // Se não achar o separador, joga tudo no campo de texto para não perder
        // Mas evita jogar o checklist automático lá dentro
        if (!data.observations.includes('Sem resíduos')) {
            form.observations = data.observations;
        }
      }

      // Tenta restaurar os botões (Checklist)
      // Se o texto contém "Sem resíduos...: OK", marca nota 5
      questions.forEach(q => {
        if (data.observations.includes(`${q.text}: OK`)) {
            answers[q.id] = 5;
        } else if (data.observations.includes(`${q.text}: Irregular`)) {
            answers[q.id] = 2;
        }
      });
    }
  } else {
    // Se não for edição, garante estado limpo
    store.resetState();
  }
})

// --- Computados ---
const totalScore = computed(() => {
  return Object.values(answers).reduce((sum, val) => sum + val, 0)
})

const maxScore = questions.length * 5 

const scoreColor = computed(() => {
  const percentage = totalScore.value / maxScore
  if (percentage < 0.5) return 'text-red-600 bg-red-50 border-red-200'
  if (percentage < 0.8) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  return 'text-green-600 bg-green-50 border-green-200'
})

const isFormValid = computed(() => {
  const allAnswered = questions.every(q => answers[q.id] !== undefined)
  return form.sectorId && form.date && allAnswered
})

// --- Ações ---

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    if (file.size > 5 * 1024 * 1024) {
      ui.notify('A imagem deve ter no máximo 5MB', 'error')
      return
    }
    form.image = file
    const reader = new FileReader()
    reader.onload = (e) => imagePreview.value = e.target?.result as string
    reader.readAsDataURL(file)
  }
}

function removeImage() {
  form.image = null
  imagePreview.value = null
}

function formatObservations() {
  const details = questions.map(q => {
    const status = answers[q.id] === 5 ? 'OK' : 'Irregular'
    return `${q.text}: ${status}`
  }).join('\n')
  
  return form.observations 
    ? `${details}\n\nObs Adicional: ${form.observations}`
    : details
}

async function handleSubmit() {
  if (!isFormValid.value) {
    ui.notify('Preencha o setor e avalie todos os itens.', 'warning')
    return
  }

  const payload = {
    sector_id: form.sectorId,
    responsible: form.responsible,
    score: totalScore.value,
    observations: formatObservations(),
    image: form.image
  }

  const success = await store.saveEvaluation(payload)
  
  if (success) {
    resetForm()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function resetForm() {
  form.sectorId = ''
  form.responsible = ''
  form.observations = ''
  form.image = null
  imagePreview.value = null
  questions.forEach(q => delete answers[q.id])
  // Também reseta o estado da store
  store.resetState()
}
</script>

<template>
  <div class="animate-fade-in space-y-6 max-w-4xl mx-auto pb-20">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span class="bg-teal-100 dark:bg-teal-900 text-teal-600 p-2 rounded-lg">
            <i class="fa-solid fa-clipboard-list"></i>
          </span>
          {{ store.editingId ? 'Editar Auditoria' : 'Nova Auditoria' }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-1">
          Preencha os dados conforme padrão 5S.
        </p>
      </div>

      <div 
        class="flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all shadow-sm w-full md:w-auto justify-between"
        :class="scoreColor"
      >
        <div class="flex flex-col">
          <span class="text-xs font-bold uppercase tracking-wider opacity-80">Nota Atual</span>
          <span class="text-3xl font-black leading-none">{{ totalScore }}</span>
        </div>
        <div class="h-10 w-px bg-current opacity-20"></div>
        <div class="text-right">
          <span class="text-xs font-medium opacity-80 block">Máximo</span>
          <span class="text-xl font-bold">{{ maxScore }}</span>
        </div>
      </div>
    </div>

    <AppCard class="p-0 overflow-hidden border-t-4 border-teal-500">
      <form @submit.prevent="handleSubmit">
        
        <div class="p-6 md:p-8 bg-white dark:bg-gray-800 space-y-6">
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            1. Identificação
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Setor Avaliado <span class="text-red-500">*</span>
              </label>
              <ComboboxSetor 
                v-model="form.sectorId" 
                @update:responsible="(name) => form.responsible = name" 
                :isInvalid="!form.sectorId && Object.keys(answers).length > 0"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Responsável pelo Setor
              </label>
              <div class="relative">
                <input 
                  v-model="form.responsible" 
                  type="text" 
                  readonly 
                  class="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 pl-10 pr-4 py-2.5 text-gray-500 cursor-not-allowed focus:ring-0"
                  placeholder="Selecione um setor..."
                />
                <i class="fa-solid fa-user absolute left-3.5 top-3.5 text-gray-400"></i>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Data da Avaliação
              </label>
              <input 
                v-model="form.date" 
                type="date" 
                :max="new Date().toISOString().split('T')[0]"
                required 
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <hr class="border-gray-100 dark:border-gray-700" />

        <div class="p-6 md:p-8 bg-gray-50 dark:bg-gray-800/50 space-y-6">
          <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            2. Critérios de Avaliação
          </h3>

          <div class="grid gap-4">
            <div 
              v-for="q in questions" 
              :key="q.id"
              class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md"
              :class="{'border-l-4 border-l-teal-500': answers[q.id] !== undefined}"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span class="font-medium text-gray-800 dark:text-gray-200 text-base">
                  {{ q.text }}
                </span>
                
                <div class="flex gap-2 w-full sm:w-auto">
                  <button 
                    type="button"
                    @click="answers[q.id] = 2"
                    class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-bold active:scale-95 touch-manipulation"
                    :class="answers[q.id] === 2 
                      ? 'bg-red-50 border-red-500 text-red-600 ring-1 ring-red-500' 
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500'"
                  >
                    <i class="fa-solid fa-xmark"></i>
                    Irregular (2)
                  </button>

                  <button 
                    type="button"
                    @click="answers[q.id] = 5"
                    class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-bold active:scale-95 touch-manipulation"
                    :class="answers[q.id] === 5 
                      ? 'bg-green-50 border-green-500 text-green-600 ring-1 ring-green-500' 
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500'"
                  >
                    <i class="fa-solid fa-check"></i>
                    Conforme (5)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr class="border-gray-100 dark:border-gray-700" />

        <div class="p-6 md:p-8 bg-white dark:bg-gray-800 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Evidência Fotográfica
              </label>
              
              <div 
                v-if="!imagePreview"
                class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-teal-500 hover:bg-teal-50/50 transition-colors cursor-pointer group"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  @change="handleImageUpload"
                />
                <div class="space-y-2 pointer-events-none">
                  <div class="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 text-teal-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <i class="fa-solid fa-camera text-xl"></i>
                  </div>
                  <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Toque para tirar foto
                  </p>
                </div>
              </div>

              <div v-else class="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 group">
                <img :src="imagePreview" class="w-full h-48 object-cover" />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    type="button"
                    @click="removeImage"
                    class="bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-red-600 transform hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <i class="fa-solid fa-trash"></i> Remover
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Observações Adicionais
              </label>
              <textarea 
                v-model="form.observations" 
                rows="5"
                class="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                placeholder="Descreva detalhes da irregularidade ou pontos de melhoria..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-end">
          <AppButton 
            type="button" 
            variant="secondary" 
            @click="resetForm"
            class="w-full sm:w-auto"
          >
            Cancelar
          </AppButton>
          
          <AppButton 
            type="submit" 
            :loading="store.loading" 
            :disabled="!isFormValid"
            class="w-full sm:w-auto shadow-xl shadow-teal-500/20"
            icon="fa-solid fa-paper-plane"
          >
            {{ store.editingId ? 'Atualizar Avaliação' : 'Finalizar Auditoria' }}
          </AppButton>
        </div>

      </form>
    </AppCard>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeUp 0.5s ease-out forwards;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>