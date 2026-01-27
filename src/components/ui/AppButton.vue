<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: string // Classe do FontAwesome (ex: "fa-solid fa-plus")
}>()

const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-95"

const variants = {
  primary: "bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md",
  secondary: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  outline: "border-2 border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20",
  ghost: "text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-gray-800"
}

const sizes = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-6 py-3"
}

const classes = computed(() => {
  return [
    baseClasses,
    variants[props.variant || 'primary'],
    sizes[props.size || 'md']
  ].join(' ')
})
</script>

<template>
  <button :class="classes" :disabled="disabled || loading">
    <i v-if="loading" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
    <i v-else-if="icon" :class="[icon, $slots.default ? 'mr-2' : '']"></i>
    <slot />
  </button>
</template>