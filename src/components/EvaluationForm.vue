<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useRouter } from 'vue-router' // <--- Importante para navegação
import { useEvaluationStore, type EvaluationFormPayload } from '../stores/evaluationStore'
import { useUiStore } from '../stores/uiStore'
import { useAuthStore } from '../stores/authStore' // <--- Importante para checar permissão de Admin
import AppButton from './ui/AppButton.vue'
import ComboboxSetor from './ComboboxSetor.vue'

const router = useRouter()
const evaluationStore = useEvaluationStore()
const uiStore = useUiStore()
const authStore = useAuthStore()

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

// --- Watchers ---
watch(() => evaluationStore.dataToEdit, (newData) => {
  if (newData) {
    form.evaluator = newData.evaluator || ''
    form.date = newData.date || today
    form.sectorId = newData.sector_id
    form.responsible = newData.responsible
    form.observations = newData.observations || ''
    Object.keys(answers).forEach(k => delete answers[k])
  }
}, { immediate: true })

// --- Ações ---

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

function close() {
  uiStore.closeModal()
  resetForm()
}

// Navegação rápida (Substitui os antigos modais)
function navigateTo(path: string) {
  close() // Fecha este modal
  router.push(path) // Vai para a página
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
    const msg = evaluationStore.editingEvaluationId ? 'Avaliação atualizada!' : 'Avaliação registrada!'
    uiStore.showToast(msg, 'success')
    close()
  } else {
    uiStore.showToast(evaluationStore.error || 'Erro ao salvar.', 'error')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" @click.self="close">
    
    <div class="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col animate-slide-up scrollbar-thin">
      
      <div class="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <i class="fa-solid fa-clipboard-check text-teal-600"></i>
            {{ evaluationStore.editingEvaluationId ? 'Editar Avaliação' : 'Nova Avaliação' }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">Preencha os dados abaixo para registrar a auditoria.</p>
        </div>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <i class="fa-solid fa-times text-xl"></i>
        </button>
      </div>

      <div class="p-6 space-y-8">
        
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 flex justify-around text-sm">
          <div class="flex items-center gap-2">
            <span class="text-2xl">😐</span>
            <span class="font-bold text-yellow-700 dark:text-yellow-400">Regular (2 pts)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">😃</span>
            <span class="font-bold text-green-700 dark:text-green-400">Excelente (5 pts)</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Avaliador</label>
              <input v-model="form.evaluator" type="text" required class="input-base" placeholder="Seu nome" />
            </div>
            
            <div class="space-y-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
              <input v-model="form.date" type="date" :max="today" required class="input-base" />
            </div>
            
            <div class="space-y-1">
               <ComboboxSetor v-model="form.sectorId" @update:responsible="(name) => form.responsible = name" />
            </div>
            
            <div class="space-y-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Responsável</label>
              <input v-model="form.responsible" type="text" required class="input-base bg-gray-50 dark:bg-gray-700" />
            </div>
          </div>

          <div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3 border-l-4 border-teal-500 pl-2">Critérios de Avaliação</h3>
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
               <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                 <thead class="bg-gray-50 dark:bg-gray-700/50">
                   <tr>
                     <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                     <th class="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase w-32">Nota</th>
                   </tr>
                 </thead>
                 <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                   <tr v-for="q in questions" :key="q.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                     <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ q.text }}</td>
                     <td class="px-4 py-3">
                       <div class="flex justify-center gap-4">
                         <label class="cursor-pointer hover:scale-110 transition-transform">
                           <input type="radio" :name="q.id" value="2" v-model="answers[q.id]" class="sr-only peer" required>
                           <span class="text-2xl grayscale opacity-40 peer-checked:grayscale-0 peer-checked:opacity-100 transition-all">😐</span>
                         </label>
                         <label class="cursor-pointer hover:scale-110 transition-transform">
                           <input type="radio" :name="q.id" value="5" v-model="answers[q.id]" class="sr-only peer" required>
                           <span class="text-2xl grayscale opacity-40 peer-checked:grayscale-0 peer-checked:opacity-100 transition-all">😃</span>
                         </label>
                       </div>
                     </td>
                   </tr>
                 </tbody>
               </table>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             <div class="space-y-2">
               <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Foto (Opcional)</label>
               <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-teal-500 transition-colors bg-gray-50 dark:bg-gray-800/50">
                 <div v-if="!imagePreview">
                   <i class="fa-solid fa-camera text-gray-400 text-2xl mb-2"></i>
                   <label class="block cursor-pointer text-sm text-teal-600 hover:underline">
                     <span>Clique para enviar</span>
                     <input type="file" class="hidden" accept="image/*" @change="handleImageUpload">
                   </label>
                 </div>
                 <div v-else class="relative inline-block">
                   <img :src="imagePreview" class="h-32 rounded shadow-sm" />
                   <button type="button" @click="imagePreview = null; form.image = null" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow-md">
                     <i class="fa-solid fa-times"></i>
                   </button>
                 </div>
               </div>
             </div>

             <div class="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/30 rounded-xl p-6 flex flex-col items-center justify-center h-full">
                <span class="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-widest">Nota Final</span>
                <span class="text-5xl font-black text-teal-600 dark:text-teal-400 my-2">{{ totalScore }}</span>
                <span class="text-xs text-teal-600/70 dark:text-teal-400/70">Máximo: 20 pontos</span>
             </div>
          </div>

          <div class="space-y-1">
             <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
             <textarea v-model="form.observations" rows="3" class="input-base resize-none" placeholder="Detalhes adicionais..."></textarea>
          </div>

        </form>

        <div class="border-t border-gray-100 dark:border-gray-700 pt-6 mt-4">
          <p class="text-xs font-bold text-gray-400 uppercase mb-3">Acesso Rápido</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
             <button @click="navigateTo('/ranking')" class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all text-sm text-gray-600 dark:text-gray-300">
               <i class="fa-solid fa-trophy text-yellow-500"></i> Ranking
             </button>
             <button @click="navigateTo('/dashboard')" class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm text-gray-600 dark:text-gray-300">
               <i class="fa-solid fa-chart-pie text-blue-500"></i> Dashboard
             </button>
             <button v-if="authStore.userRole === 'admin'" @click="uiStore.openAdminModal" class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-sm text-gray-600 dark:text-gray-300">
               <i class="fa-solid fa-cog text-purple-500"></i> Admin
             </button>
          </div>
        </div>

      </div>

      <div class="sticky bottom-0 z-20 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
         <AppButton variant="secondary" @click="close">Cancelar</AppButton>
         <AppButton 
           @click="handleSubmit" 
           :loading="evaluationStore.loading" 
           :disabled="!isFormValid"
           icon="fa-solid fa-check"
         >
           {{ evaluationStore.editingEvaluationId ? 'Salvar Alterações' : 'Finalizar Avaliação' }}
         </AppButton>
      </div>

    </div>
  </div>
</template>

<style scoped>
.input-base {
  @apply w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all;
}

.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
.dark .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #4b5563; }

.animate-fade-in { animation: fadeIn 0.2s ease-out; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>