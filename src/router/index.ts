import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('../views/LoginView.vue'),
            meta: { requiresGuest: true }
        },
        {
            path: '/',
            redirect: '/booking'
        },
        {
            path: '/booking',
            name: 'Booking',
            component: () => import('../views/BookingView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/profile',
            name: 'Profile',
            component: () => import('../views/ProfileView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/admin',
            name: 'Admin',
            redirect: '/admin/calendar'
        },
        {
            path: '/admin/calendar',
            name: 'Calendar',
            component: () => import('../views/CalendarView.vue')
        },
        {
            path: '/admin/services',
            name: 'Services',
            component: () => import('../views/ServicesView.vue')
        },
        {
            path: '/admin/availability',
            name: 'Availability',
            component: () => import('../views/AvailabilityView.vue')
        }
    ]
})

// Navigation guards
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        // Redirect to login if not authenticated
        next('/login')
    } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
        // Redirect to home if already authenticated
        next('/')
    } else if (authStore.isAuthenticated && to.path !== '/profile' && (!authStore.customer?.name || !authStore.customer?.phone)) {
        // Redirect to profile if authenticated but profile is incomplete
        // But allow admin routes or if specifically navigating to profile
        if (to.path.startsWith('/admin')) {
            next()
        } else {
            next('/profile')
        }
    } else {
        next()
    }
})

export default router
