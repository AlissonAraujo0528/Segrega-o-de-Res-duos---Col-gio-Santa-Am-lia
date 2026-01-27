import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/authStore'

const app = createApp(App)
const pinia = createPinia()

// 1. Instala os Plugins
app.use(pinia)
app.use(router)

// 2. Inicializa a Autenticação
// Isso garante que o listener do Supabase (onAuthStateChange)
// comece a rodar antes mesmo da aplicação aparecer na tela.
const authStore = useAuthStore()
authStore.initialize()

// 3. Monta a aplicação
app.mount('#app')