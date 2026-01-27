import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

// --- Importação das Views (Lazy Loading) ---
const LoginView = () => import('../views/LoginView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const RankingView = () => import('../views/RankingView.vue')

const router = createRouter({
  // MUDANÇA: createWebHashHistory resolve o erro 404 no GitHub Pages
  // O base url garante que funcione em subpastas (ex: /seu-repositorio/)
  history: createWebHashHistory(import.meta.env.BASE_URL),
  
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false } // Página pública (Login)
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true } // Protegido
    },
    {
      path: '/ranking',
      name: 'ranking',
      component: RankingView,
      meta: { requiresAuth: true } // Protegido
    },
    // Rota coringa: Se digitar qualquer coisa errada, volta pro inicio
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// --- GUARDA DE ROTAS ---
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 1. Inicializa autenticação se necessário (Reload da página)
  if (!authStore.isAuthReady) {
    await authStore.initialize()
  }

  const isAuthenticated = authStore.isAuthenticated

  // 2. Proteção: Se a rota requer auth e não está logado -> Login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' })
  }

  // 3. Redirecionamento: Se já está logado e tenta ir pro Login -> Dashboard
  if (to.name === 'login' && isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  // 4. Segue o fluxo
  next()
})

export default router