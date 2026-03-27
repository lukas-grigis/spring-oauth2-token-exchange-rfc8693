import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/login',
      component: () => import('../pages/LoginPage.vue'),
    },
    {
      path: '/dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  const auth = useAuth();
  if (!auth.isInitialized.value) {
    await auth.init();
  }
  if (!auth.isAuthenticated.value) {
    return '/login';
  }
  return true;
});

export default router;
