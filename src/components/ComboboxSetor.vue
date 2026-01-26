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
import { useEvaluationStore, type Sector } from '../stores/evaluationStore'

const props = defineProps<{
  // Aceita string (UUID) ou number (legado)
  modelValue: string | number | null
  isInvalid?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'update:responsible', name: string): void
}>()

const store = useEvaluationStore()
const query = ref('')
const selectedSector = ref<Sector | null>(null)
const filteredSectors = ref<Sector[]>([])
const loading = ref(false)

let debounceTimeout: ReturnType<typeof setTimeout>

const onQueryChange = (event: Event) => {
  const val = (event.target as HTMLInputElement).value
  query.value = val
  loading.value = true

  clearTimeout(debounceTimeout)
  
  debounceTimeout = setTimeout(async () => {
    if (val.trim().length >= 1) {
      try {
        filteredSectors.value = await store.searchSectors(val)
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

watch(selectedSector, (newSector) => {
  if (newSector) {
    emit('update:modelValue', newSector.id)
    if (newSector.default_responsible) {
      emit('update:responsible', newSector.default_responsible)
    }
  }
})

watch(() => props.modelValue, async (newId) => {
  if (newId) {
    // Se já estiver selecionado, evita re-buscar
    // Verifica tanto como string quanto como number/original para garantir
    if (selectedSector.value?.id === newId) return
    if (selectedSector.value?.id === newId.toString()) return

    const sector = await store.getSectorById(newId.toString())
    if (sector) {
      selectedSector.value = sector
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
      <div class="relative mt-1">
        <label class="mb-2 block text-sm font-medium text-gray-700">
          Setor / Sala:
        </label>
        
        <div
          class="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm focus:outline-none sm:text-sm"
          :class="isInvalid ? 'ring-2 ring-red-500' : 'border border-gray-300'"
        >
          <ComboboxInput
            class="w-full border-none py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
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
            class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
          >
            <div v-if="loading" class="relative cursor-default select-none py-2 px-4 text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Buscando...
              </span>
            </div>

            <div v-else-if="filteredSectors.length === 0 && query !== ''"
                 class="relative cursor-default select-none py-2 px-4 text-gray-700">
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
                class="relative cursor-default select-none py-2 pl-10 pr-4"
                :class="{
                  'bg-teal-600 text-white': active,
                  'text-gray-900': !active,
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
                  :class="{ 'text-white': active, 'text-teal-600': !active }"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ComboboxOption>
          </ComboboxOptions>
        </TransitionRoot>
      </div>
    </Combobox>
    
    <p v-if="isInvalid" class="mt-1 text-sm text-red-500">Selecione um setor válido.</p>
  </div>
</template>