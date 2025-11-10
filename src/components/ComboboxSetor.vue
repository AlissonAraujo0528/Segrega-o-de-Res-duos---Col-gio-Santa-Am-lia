<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useEvaluationStore } from '../stores/evaluationStore'

interface Sector {
  id: string
  name: string
  default_responsible: string
}

const props = defineProps<{
  modelValue: string
  isInvalid?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  (e: 'update:responsible', name: string): void
}>()

const store = useEvaluationStore()
const searchText = ref('')
const results = ref<Sector[]>([])
const isLoading = ref(false)
const isOpen = ref(false)
const combobox = ref<HTMLDivElement | null>(null)
let debounceTimer: number | undefined = undefined

const activeOptionIndex = ref(-1)
const listboxEl = ref<HTMLUListElement | null>(null)
const listboxId = `sector-listbox-${Math.random().toString(36).substring(2, 9)}`

const ariaActiveDescendant = computed(() => {
  if (activeOptionIndex.value >= 0 && results.value[activeOptionIndex.value]) {
    return `sector-option-${activeOptionIndex.value}`
  }
  return undefined
})

watch(searchText, (newQuery) => {
  if (newQuery === results.value.find(r => r.id === props.modelValue)?.name) {
    results.value = []
    return
  }

  if (!newQuery) {
    results.value = []
    emit('update:modelValue', '')
    emit('update:responsible', '')
    isLoading.value = false
    clearTimeout(debounceTimer)
    activeOptionIndex.value = -1
    return
  }

  isLoading.value = true
  isOpen.value = true
  activeOptionIndex.value = -1
  clearTimeout(debounceTimer)

  debounceTimer = setTimeout(async () => {
    results.value = await store.searchSectors(newQuery)
    isLoading.value = false
  }, 300) as unknown as number
})

function selectSector(sector: Sector) {
  searchText.value = sector.name
  emit('update:modelValue', sector.id)
  emit('update:responsible', sector.default_responsible)
  isOpen.value = false
  activeOptionIndex.value = -1
  results.value = []
}

watch(() => props.modelValue, async (newId) => {
  if (newId && newId !== results.value.find(r => r.id === newId)?.id) {
    const sector = await store.getSectorById(newId)
    if (sector) {
      searchText.value = sector.name
    }
  } else if (!newId) {
    searchText.value = ''
  }
}, { immediate: true })

function closeDropdown() {
  setTimeout(() => {
    isOpen.value = false
  }, 150)
}

watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) {
    activeOptionIndex.value = -1
  }
})

function scrollToActiveOption() {
  nextTick(() => {
    if (listboxEl.value && ariaActiveDescendant.value) {
      const activeEl = document.getElementById(ariaActiveDescendant.value)
      activeEl?.scrollIntoView({ block: 'nearest' })
    }
  })
}

function onArrowDown() {
  if (results.value.length === 0) return
  if (activeOptionIndex.value < results.value.length - 1) {
    activeOptionIndex.value++
  } else {
    activeOptionIndex.value = 0
  }
  scrollToActiveOption()
}

function onArrowUp() {
  if (results.value.length === 0) return
  if (activeOptionIndex.value > 0) {
    activeOptionIndex.value--
  } else {
    activeOptionIndex.value = results.value.length - 1
  }
  scrollToActiveOption()
}

function onEnter() {
  const selected = results.value[activeOptionIndex.value]

  if (activeOptionIndex.value >= 0 && selected) {
    selectSector(selected)
  }
}

function onEscape() {
  isOpen.value = false
  ;(document.activeElement as HTMLElement)?.blur()
}
</script>

<template>
  <div ref="combobox" class="relative">
    <label
      for="sector-combobox"
      class="mb-2 block text-sm font-medium text-text-secondary"
    >
      Setor/Sala:
    </label>

    <input
      id="sector-combobox"
      type="text"
      role="combobox"
      aria-haspopup="listbox"
      v-model="searchText"
      @focus="isOpen = true"
      @blur="closeDropdown"
      @keydown.down.prevent="onArrowDown"
      @keydown.up.prevent="onArrowUp"
      @keydown.enter.prevent="onEnter"
      @keydown.esc.prevent="onEscape"
      placeholder="Digite para buscar um setor..."
      required
      autocomplete="off"
      :aria-autocomplete="'list'"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-activedescendant="ariaActiveDescendant"
      :aria-invalid="isInvalid"
      class="w-full rounded-lg border border-border-light p-3 shadow-sm outline-none transition-all
             focus-ring:ring-2 focus-ring:ring-primary
             invalid:border-danger"
    />

    <transition name="fade-scale">
      <div
        v-if="isOpen && (results.length > 0 || isLoading || searchText.length >= 0)"
        class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-secondary shadow-lg
               backdrop-blur-xs
               transition-all duration-150 origin-top"
      >
        <ul
          :id="listboxId"
          ref="listboxEl"
          role="listbox"
          aria-label="Setores"
        >
          <li
            v-if="isLoading"
            role="presentation"
            class="p-3 text-center text-text-secondary"
          >
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>Buscando...
          </li>

          <li
            v-else-if="!isLoading && results.length === 0 && searchText.length === 0"
            role="presentation"
            class="p-3 text-center text-sm text-text-secondary"
          >
            Digite o nome da sala/setor...
          </li>

          <li
            v-else-if="!isLoading && results.length === 0 && searchText.length > 0"
            role="presentation"
            class="p-3 text-center text-text-secondary"
          >
            Nenhum setor encontrado.
          </li>

          <li
            v-for="(sector, index) in results"
            :key="sector.id"
            :id="`sector-option-${index}`"
            role="option"
            :aria-selected="sector.id === props.modelValue"
            @mousedown.prevent="selectSector(sector)"
            class="cursor-pointer p-3 transition-colors"
            :class="{
              'bg-klin-vibrant/10': index === activeOptionIndex,
              'hover:bg-klin-vibrant/10': index !== activeOptionIndex
            }"
          >
            {{ sector.name }}
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>