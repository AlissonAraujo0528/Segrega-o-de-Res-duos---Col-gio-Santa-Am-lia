// tailwind.config.ts (VERSÃO FINAL E CORRETA)

import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
    // 1. Caminhos do 'content' (✅ CORREÇÃO: Restauramos o caminho do components)
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
        './src/components/**/*.{vue,js,ts,jsx,tsx}' // <-- Este é o caminho que faltava
    ],
    
    // 2. Modo escuro (Correto)
    darkMode: 'class',

    // 3. Tema (Correto - Simplificado pela Fase 4)
    theme: {
      extend: {
        colors: {
          'bg-primary': 'var(--color-bg-primary)',
          'bg-secondary': 'var(--color-bg-secondary)',
          'bg-tertiary': 'var(--color-bg-tertiary)',

          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',

          'border-light': 'var(--color-border-light)',
          
          // Variáveis que o style.css precisa referenciar
          'border-dark': 'var(--color-border-dark)', 
          'primary': 'var(--color-primary)',
          'primary-dark': 'var(--color-primary-dark)',
          'klin-vibrant': 'var(--color-klin-vibrant)',

          // Cores semânticas diretas
          'warning': 'var(--color-warning)',
          'danger': 'var(--color-danger)',
          'success': 'var(--color-success)',
        }
      }
    },

    // 4. Plugins (Correto - Com tipagem da Fase 2.5)
    plugins: [
        plugin(function ({ addVariant }) { 
            addVariant('invalid', '&:where([aria-invalid=true], [aria-invalid=true] *)')
            addVariant('focus-ring', '&:where(:focus-visible, .focus-visible)')
        }),
    ],
} satisfies Config