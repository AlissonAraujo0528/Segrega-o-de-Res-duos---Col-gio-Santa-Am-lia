import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

// --- Importação das Views (Lazy Loading para performance) ---
// O usuário só baixa o código dessas páginas quando realmente precisar
const LoginView = () => import('../views/LoginView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const RankingView = () => import('../views/RankingView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true, layout: 'empty' } // Tela cheia, sem navbar
    },
    {
      path: '/',
      redirect: '/dashboard' // Home redireciona automaticamente para o painel
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { public: false, layout: 'main' } // Requer login, usa MainLayout
    },
    {
      path: '/ranking',
      name: 'ranking',
      component: RankingView,
      meta: { public: false, layout: 'main' }
    },
    // Rota coringa: Se digitar qualquer coisa errada, vai pro dashboard
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// --- GUARDA DE ROTAS (Segurança Profissional) ---
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 1. Se o sistema acabou de abrir, espera o Supabase dizer se tem usuário
  if (!authStore.isAuthReady) {
    await authStore.initialize()
  }

  const isAuthenticated = !!authStore.user

  // 2. Regra: Se a rota NÃO é pública e o usuário NÃO tá logado
  if (!to.meta.public && !isAuthenticated) {
    return next({ name: 'login' })
  }

  // 3. Regra: Se o usuário JÁ tá logado e tenta ir pro Login
  if (to.name === 'login' && isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  // 4. Tudo certo, segue o jogo
  next()
})

export default router