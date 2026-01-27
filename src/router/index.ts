import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

// --- Importação das Views (Lazy Loading) ---
const LoginView = () => import('../views/LoginView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const RankingView = () => import('../views/RankingView.vue')
const EvaluationView = () => import('../views/EvaluationView.vue')

const router = createRouter({
  // createWebHashHistory é vital para o GitHub Pages (evita erro 404)
  history: createWebHashHistory(import.meta.env.BASE_URL),
  
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/evaluation',
      name: 'evaluation',
      component: EvaluationView,
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/ranking',
      name: 'ranking',
      component: RankingView,
      meta: { requiresAuth: true }
    },
    // Rota coringa
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// --- GUARDA DE ROTAS ---
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 1. Garante que o estado de auth foi carregado
  if (!authStore.isAuthReady) {
    await authStore.initialize()
  }

  const isAuthenticated = authStore.isAuthenticated

  // 2. Protege rotas privadas
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' })
  }

  // 3. Redireciona usuário logado para a AVALIAÇÃO (Home)
  if (to.name === 'login' && isAuthenticated) {
    return next({ name: 'evaluation' }) // <--- MUDANÇA DE FLUXO
  }

  next()
})

export default router