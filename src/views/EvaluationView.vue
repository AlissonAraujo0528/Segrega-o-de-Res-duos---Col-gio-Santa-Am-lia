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

const questions = [
  { id: 'organicos', text: 'Sem resíduos orgânicos nos recicláveis?' },
  { id: 'sanitarios', text: 'Sem papéis sanitários nos recicláveis?' },
  { id: 'outros', text: 'Sem não-recicláveis (clipes, fitas)?' },
  { id: 'nivel', text: 'Nível dos coletores está adequado?' },
]

const form = reactive({
  sectorId: '' as string,
  responsible: '',
  date: new Date().toISOString().split('T')[0],
  observations: '',
  image: null as File | null
})

const answers = reactive<Record<string, number>>({})
const imagePreview = ref<string | null>(null)

onMounted(() => {
  if (store.editingId && store.currentEvaluation) {
    const data = store.currentEvaluation;
    form.sectorId = data.sector_id;
    form.responsible = data.responsible;
    
    if (data.details?.photo_url) {
      imagePreview.value = data.details.photo_url;
    }

    if (data.observations) {
      const parts = data.observations.split('\n\nObs Adicional: ');
      if (parts.length > 1) {
        form.observations = parts[1];
      } else {
        if (!data.observations.includes('Sem resíduos')) {
            form.observations = data.observations;
        }
      }

      questions.forEach(q => {
        if (data.observations.includes(`${q.text}: OK`)) {
            answers[q.id] = 5;
        } else if (data.observations.includes(`${q.text}: Irregular`)) {
            answers[q.id] = 2;
        }
      });
    }
  } else {
    store.resetState();
  }
})

const totalScore = computed(() => {
  return Object.values(answers).reduce((sum, val) => sum + val, 0)
})

const maxScore = questions.length * 5 

const scoreColor = computed(() => {
  const percentage = totalScore.value / maxScore
  if (percentage < 0.5) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20'
  if (percentage < 0.8) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20'
  return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20'
})

const isFormValid = computed(() => {
  const allAnswered = questions.every(q => answers[q.id] !== undefined)
  return form.sectorId && form.date && allAnswered
})

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
  store.resetState()
}
</script>

<template>
  <div class="animate-fade-in space-y-4 max-w-2xl mx-auto pb-24 md:pb-10">
    
    <div class="sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-3 -mx-4 px-4 mb-4 md:static md:bg-transparent md:border-none md:p-0 md:mb-6 transition-colors">
      <div class="flex justify-between items-center max-w-2xl mx-auto">
        <div>
           <h1 class="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
             <i class="fa-solid fa-clipboard-check text-teal-600"></i>
             {{ store.editingId ? 'Editar' : 'Auditoria' }}
           </h1>
           <p class="text-xs text-gray-500 dark:text-gray-400">Preencha o checklist 5S.</p>
        </div>
        
        <div class="flex flex-col items-center px-4 py-1 rounded-lg border-2 transition-colors" :class="scoreColor">
           <span class="text-2xl font-black leading-none">{{ totalScore }}</span>
           <span class="text-[10px] uppercase font-bold opacity-80">Pontos</span>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      
      <AppCard class="p-4 sm:p-6">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i class="fa-solid fa-location-dot"></i> Identificação
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Setor Avaliado</label>
            <ComboboxSetor 
              v-model="form.sectorId" 
              @update:responsible="(name) => form.responsible = name" 
              :isInvalid="!form.sectorId && Object.keys(answers).length > 0"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Responsável</label>
                <input 
                  v-model="form.responsible" 
                  type="text" 
                  readonly 
                  class="w-full rounded-xl border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 px-3 py-3 text-sm text-gray-500" 
                  placeholder="Automático" 
                />
             </div>
             <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data</label>
                <input 
                  v-model="form.date" 
                  type="date" 
                  :max="new Date().toISOString().split('T')[0]"
                  required 
                  class="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
             </div>
          </div>
        </div>
      </AppCard>

      <AppCard class="p-4 sm:p-6">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i class="fa-solid fa-list-check"></i> Critérios
        </h3>

        <div class="space-y-4">
          <div 
            v-for="q in questions" 
            :key="q.id"
            class="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700"
          >
             <p class="font-medium text-gray-800 dark:text-gray-200 text-sm mb-3">
               {{ q.text }}
             </p>
             
             <div class="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  @click="answers[q.id] = 2"
                  class="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all active:scale-95 touch-manipulation"
                  :class="answers[q.id] === 2 
                    ? 'bg-red-100 border-red-500 text-red-700 ring-1 ring-red-500 dark:bg-red-900/30 dark:text-red-300' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'"
                >
                  <i class="fa-solid fa-xmark"></i> Irregular
                </button>

                <button 
                  type="button"
                  @click="answers[q.id] = 5"
                  class="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all active:scale-95 touch-manipulation"
                  :class="answers[q.id] === 5 
                    ? 'bg-green-100 border-green-500 text-green-700 ring-1 ring-green-500 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'"
                >
                  <i class="fa-solid fa-check"></i> Conforme
                </button>
             </div>
          </div>
        </div>
      </AppCard>

      <AppCard class="p-4 sm:p-6">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <i class="fa-solid fa-camera"></i> Evidências
        </h3>

        <div class="space-y-4">
            <div 
               v-if="!imagePreview"
               class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
               <input 
                 type="file" 
                 accept="image/*" 
                 class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 @change="handleImageUpload"
               />
               <div class="text-teal-600 mb-2">
                 <i class="fa-solid fa-camera text-3xl"></i>
               </div>
               <p class="text-sm font-bold text-gray-600 dark:text-gray-300">
                 Toque para adicionar foto
               </p>
            </div>

            <div v-else class="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <img :src="imagePreview" class="w-full h-56 object-cover" />
              <button 
                type="button"
                @click="removeImage"
                class="absolute top-3 right-3 bg-red-600 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

            <div>
               <label class="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Observações</label>
               <textarea 
                 v-model="form.observations" 
                 rows="3" 
                 class="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                 placeholder="Detalhes opcionais..."
               ></textarea>
            </div>
        </div>
      </AppCard>

      <div class="grid grid-cols-2 gap-3 pt-2">
         <AppButton 
           type="button" 
           variant="secondary" 
           @click="resetForm"
           class="py-4"
         >
           Limpar
         </AppButton>
         
         <AppButton 
           type="submit" 
           :loading="store.loading" 
           :disabled="!isFormValid"
           class="py-4 shadow-xl shadow-teal-500/20"
         >
           {{ store.editingId ? 'Atualizar' : 'Finalizar' }}
         </AppButton>
      </div>

    </form>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeUp 0.4s ease-out forwards; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>