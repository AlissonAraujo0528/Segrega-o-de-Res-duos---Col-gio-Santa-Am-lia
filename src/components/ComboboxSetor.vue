<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  TransitionRoot
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'
import { evaluationService } from '../services/evaluationService'
import { supabaseClient } from '../lib/supabaseClient' 

// Definição local do tipo para evitar erros de importação
interface Sector {
  id: string
  name: string
  default_responsible?: string | null
}

const props = defineProps<{
  // Aceita string (UUID) ou number (legado)
  modelValue: string | number | null
  isInvalid?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'update:responsible', name: string): void
}>()

const query = ref('')
const selectedSector = ref<Sector | null>(null)
const filteredSectors = ref<Sector[]>([])
const loading = ref(false)

let debounceTimeout: ReturnType<typeof setTimeout>

// --- Busca de setores via Service ---
const onQueryChange = (event: Event) => {
  const val = (event.target as HTMLInputElement).value
  query.value = val
  loading.value = true

  clearTimeout(debounceTimeout)
  
  debounceTimeout = setTimeout(async () => {
    if (val.trim().length >= 1) {
      try {
        // Casting seguro pois o retorno do banco é compatível com Sector
        const results = await evaluationService.searchSectors(val)
        filteredSectors.value = results as Sector[]
      } catch (error) {
        console.error("Erro na busca:", error)
        filteredSectors.value = []
      }
    } else {
      filteredSectors.value = []
    }
    loading.value = false
  }, 300)
}

// --- Atualiza o pai quando seleciona ---
watch(selectedSector, (newSector) => {
  if (newSector) {
    emit('update:modelValue', newSector.id)
    if (newSector.default_responsible) {
      emit('update:responsible', newSector.default_responsible)
    }
  }
})

// --- Carrega o setor inicial (Edição) ---
watch(() => props.modelValue, async (newId) => {
  if (newId) {
    // Evita recarregar se já for o mesmo que está selecionado
    if (selectedSector.value?.id === newId) return
    if (selectedSector.value?.id === newId.toString()) return

    try {
      // Busca direta no banco para resolver o ID para Nome
      const { data, error } = await supabaseClient
        .from('sectors')
        .select('id, name, default_responsible')
        .eq('id', newId)
        .single()
      
      if (!error && data) {
        selectedSector.value = data as Sector
      }
    } catch (err) {
      console.error('Erro ao carregar setor inicial:', err)
    }
  } else {
    selectedSector.value = null
    query.value = ''
  }
}, { immediate: true })

const displayValue = (item: unknown) => {
  return (item as Sector)?.name ?? ''
}
</script>

<template>
  <div class="w-full">
    <Combobox v-model="selectedSector" nullable>
      <div class="relative">
        <label class="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Setor / Sala
        </label>
        
        <div
          class="relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-sm focus:outline-none sm:text-sm"
          :class="isInvalid ? 'ring-2 ring-red-500' : 'border border-gray-300 dark:border-gray-600'"
        >
          <ComboboxInput
            class="w-full border-none py-2.5 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-white bg-transparent focus:ring-2 focus:ring-teal-500 outline-none"
            :displayValue="displayValue"
            @change="onQueryChange"
            placeholder="Digite para buscar..."
            autocomplete="off"
          />
          <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </ComboboxButton>
        </div>

        <TransitionRoot
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          @after-leave="query = ''"
        >
          <ComboboxOptions
            class="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
          >
            <div v-if="loading" class="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
              <span class="flex items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-teal-600"></i>
                Buscando...
              </span>
            </div>

            <div v-else-if="filteredSectors.length === 0 && query !== ''"
                 class="relative cursor-default select-none py-2 px-4 text-gray-500 dark:text-gray-400">
              Nenhum setor encontrado.
            </div>

            <ComboboxOption
              v-for="sector in filteredSectors"
              as="template"
              :key="sector.id"
              :value="sector"
              v-slot="{ selected, active }"
            >
              <li
                class="relative cursor-default select-none py-2 pl-10 pr-4 transition-colors"
                :class="{
                  'bg-teal-600 text-white': active,
                  'text-gray-900 dark:text-white': !active,
                }"
              >
                <span class="block truncate" :class="{ 'font-medium': selected }">
                  {{ sector.name }}
                  <span v-if="sector.default_responsible" class="ml-2 text-xs opacity-75">
                    ({{ sector.default_responsible }})
                  </span>
                </span>
                <span
                  v-if="selected"
                  class="absolute inset-y-0 left-0 flex items-center pl-3"
                  :class="{ 'text-white': active, 'text-teal-600 dark:text-teal-400': !active }"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ComboboxOption>
          </ComboboxOptions>
        </TransitionRoot>
      </div>
    </Combobox>
    
    <p v-if="isInvalid" class="mt-1 text-xs text-red-500 font-bold flex items-center gap-1">
      <i class="fa-solid fa-circle-exclamation"></i> Selecione um setor válido.
    </p>
  </div>
</template>