<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEvaluationStore, type EvaluationFormPayload } from '../stores/evaluationStore'
import { useUiStore } from '../stores/uiStore'
// Removido useAuthStore pois não estava sendo usado no template atual
import AppButton from '../components/ui/AppButton.vue'
import AppCard from '../components/ui/AppCard.vue'
import ComboboxSetor from '../components/ComboboxSetor.vue'

const router = useRouter()
const evaluationStore = useEvaluationStore()
const uiStore = useUiStore()

// CSS Base
const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"

// --- Estado do Formulário ---
const form = reactive({
  evaluator: '',
  date: new Date().toISOString().split('T')[0],
  sectorId: null as string | null,
  responsible: '',
  observations: '',
  image: null as File | null
})

const questions = [
  { id: 'organicos', text: 'Sem presença de resíduos orgânicos nos recicláveis' },
  { id: 'sanitarios', text: 'Sem presença de papéis sanitários nos recicláveis' },
  { id: 'outros', text: 'Sem outros não recicláveis (Ex.: Clipes, fitas, etc.)' },
  { id: 'nivel', text: 'Nível dos coletores adequado' },
]

const answers = reactive<Record<string, string>>({})
const imagePreview = ref<string | null>(null)

// --- Computados ---
const totalScore = computed(() => {
  return Object.values(answers).reduce((sum, val) => sum + (parseInt(val) || 0), 0)
})

const isFormValid = computed(() => {
  const allQuestionsAnswered = questions.every(q => !!answers[q.id])
  return form.evaluator && form.date && form.sectorId && form.responsible && allQuestionsAnswered
})

const today = new Date().toISOString().split('T')[0]

// --- Inicialização ---
onMounted(() => {
    if (evaluationStore.dataToEdit) {
        const d = evaluationStore.dataToEdit
        form.evaluator = d.evaluator || ''
        form.date = d.date || today
        form.sectorId = d.sector_id
        form.responsible = d.responsible
        form.observations = d.observations || ''
    } else {
        resetForm()
    }
})

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    form.image = file
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
  evaluationStore.clearEditMode()
}

async function handleSubmit() {
  if (!isFormValid.value) {
    return uiStore.showToast('Preencha todos os campos obrigatórios.', 'error')
  }

  const payload: EvaluationFormPayload = {
    sector_id: form.sectorId!,
    responsible: form.responsible,
    score: totalScore.value,
    weight: 0,
    observations: JSON.stringify(answers) + '\n\n' + form.observations,
    image: form.image
  }

  const success = await evaluationStore.submitEvaluation(payload)

  if (success) {
    uiStore.showToast('Avaliação registrada com sucesso!', 'success')
    resetForm()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    uiStore.showToast(evaluationStore.error || 'Erro ao salvar.', 'error')
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in pb-20">
    
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-clipboard-check text-teal-600"></i> Nova Avaliação
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Preencha o formulário abaixo para registrar uma auditoria.
        </p>
      </div>

      <div class="flex gap-3 w-full md:w-auto bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
        <button 
           @click="router.push('/dashboard')"
           class="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
        >
          <i class="fa-solid fa-chart-pie text-blue-500"></i> Dashboard
        </button>
        <button 
           @click="router.push('/ranking')"
           class="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
        >
          <i class="fa-solid fa-trophy text-yellow-500"></i> Ranking
        </button>
      </div>
    </header>

    <AppCard class="p-6 md:p-8 max-w-4xl mx-auto border-t-4 border-t-teal-500 shadow-lg">
        
        <div class="mb-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 flex justify-around text-sm">
          <div class="flex items-center gap-2">
            <span class="text-2xl">😐</span>
            <span class="font-bold text-yellow-700 dark:text-yellow-400">Regular (2 pts)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">😃</span>
            <span class="font-bold text-green-700 dark:text-green-400">Excelente (5 pts)</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-8">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Avaliador</label>
              <input v-model="form.evaluator" type="text" required :class="inputClass" placeholder="Seu nome" />
            </div>
            
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Data</label>
              <input v-model="form.date" type="date" :max="today" required :class="inputClass" />
            </div>
            
            <div class="space-y-1">
               <ComboboxSetor v-model="form.sectorId" @update:responsible="(name) => form.responsible = name" />
            </div>
            
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Responsável</label>
              <input v-model="form.responsible" type="text" required :class="inputClass" class="bg-gray-50 dark:bg-gray-700 cursor-not-allowed" readonly />
            </div>
          </div>

          <hr class="border-gray-100 dark:border-gray-700" />

          <div>
            <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span class="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs px-2 py-1 rounded">Passo 2</span>
                Critérios de Avaliação
            </h3>
            
            <div class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
               <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                 <thead class="bg-gray-50 dark:bg-gray-800">
                   <tr>
                     <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Item a verificar</th>
                     <th class="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase w-32">Avaliação</th>
                   </tr>
                 </thead>
                 <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                   <tr v-for="q in questions" :key="q.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                     <td class="px-4 py-4 text-sm text-gray-800 dark:text-gray-200 font-medium">{{ q.text }}</td>
                     <td class="px-4 py-4 bg-gray-50/50 dark:bg-gray-800/50">
                       <div class="flex justify-center gap-6">
                         <label class="cursor-pointer group relative">
                           <input type="radio" :name="q.id" value="2" v-model="answers[q.id]" class="sr-only peer" required>
                           <span class="text-3xl grayscale opacity-30 peer-checked:grayscale-0 peer-checked:opacity-100 peer-checked:scale-110 block transition-all group-hover:opacity-70">😐</span>
                           <span class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-600 opacity-0 peer-checked:opacity-100 transition-opacity duration-300">Ruim</span>
                         </label>
                         <label class="cursor-pointer group relative">
                           <input type="radio" :name="q.id" value="5" v-model="answers[q.id]" class="sr-only peer" required>
                           <span class="text-3xl grayscale opacity-30 peer-checked:grayscale-0 peer-checked:opacity-100 peer-checked:scale-110 block transition-all group-hover:opacity-70">😃</span>
                           <span class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-green-600 opacity-0 peer-checked:opacity-100 transition-opacity duration-300">Bom</span>
                         </label>
                       </div>
                     </td>
                   </tr>
                 </tbody>
               </table>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             <div class="space-y-2">
               <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Evidência Fotográfica</label>
               <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-teal-500 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-all cursor-pointer bg-gray-50 dark:bg-gray-800/50 relative group h-48 flex items-center justify-center">
                 
                 <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" @change="handleImageUpload">
                 
                 <div v-if="!imagePreview" class="group-hover:scale-105 transition-transform">
                   <div class="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-3">
                     <i class="fa-solid fa-camera text-xl"></i>
                   </div>
                   <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Toque para adicionar foto</p>
                   <p class="text-xs text-gray-400 mt-1">Opcional</p>
                 </div>

                 <div v-else class="relative inline-block w-full h-full">
                   <img :src="imagePreview" class="w-full h-full object-cover rounded-lg shadow-md" />
                   <button type="button" @click.prevent="imagePreview = null; form.image = null" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600 z-20 transition-colors">
                     <i class="fa-solid fa-times"></i>
                   </button>
                 </div>
               </div>
             </div>

             <div class="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-teal-500/20 flex flex-col items-center justify-center h-48 text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-full bg-white opacity-5 mix-blend-overlay pointer-events-none"></div>
                
                <span class="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-2 relative z-10">Nota Calculada</span>
                
                <div class="relative z-10 flex items-baseline gap-1">
                    <span class="text-7xl font-black tracking-tighter">{{ totalScore }}</span>
                    <span class="text-xl opacity-60">/ 20</span>
                </div>
                
                <div class="mt-4 relative z-10">
                    <span v-if="totalScore >= 19" class="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm border border-white/30">
                        <i class="fa-solid fa-star text-yellow-300 mr-1"></i> Excelente
                    </span>
                    <span v-else-if="totalScore >= 15" class="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm border border-white/30">
                        <i class="fa-solid fa-check mr-1"></i> Bom
                    </span>
                    <span v-else class="bg-red-500/30 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm border border-red-400/50">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> Atenção
                    </span>
                </div>
             </div>
          </div>

          <div class="space-y-1">
             <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Observações Finais</label>
             <textarea v-model="form.observations" rows="3" :class="inputClass" class="resize-none" placeholder="Digite aqui detalhes importantes sobre a inspeção..."></textarea>
          </div>

          <div class="pt-4">
            <AppButton 
                type="submit" 
                :loading="evaluationStore.loading" 
                :disabled="!isFormValid"
                class="w-full py-4 text-lg font-bold shadow-xl shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                icon="fa-solid fa-check-circle"
            >
                Finalizar Avaliação
            </AppButton>
          </div>

        </form>
    </AppCard>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>