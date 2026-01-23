<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LoginForm from '../components/auth/LoginForm.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

// Determine context from redirect URL
const loginContext = computed(() => {
  const redirect = route.query.redirect as string
  // If redirecting to a provider route, show provider context
  if (redirect && redirect.startsWith('/provider')) {
    return 'provider'
  }
  // Check explicit context parameter as fallback
  return route.query.context as string || 'customer'
})

const subtitle = computed(() => {
  if (loginContext.value === 'provider') {
    return t('auth.context.provider')
  }
  return t('auth.context.customer')
})

onMounted(async () => {
  // If already authenticated, redirect to home
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  }
})

function handleLoginSuccess() {
  // Success - determine where to redirect
  const redirect = route.query.redirect as string
  
  // Smart redirect logic
  if (redirect === '/provider') {
    // Provider redirect - existing provider goes to dashboard, new provider to registration
    if (authStore.provider) {
      router.push('/provider/dashboard')
    } else {
      router.push('/provider/profile')
    }
  } else if (redirect === '/customer') {
    // Customer redirect - check profile completion
    if (authStore.customer && authStore.customer.name && authStore.customer.phone) {
      // Complete profile - go to booking
      router.push('/booking')
    } else {
      // Incomplete or no profile - go to profile
      router.push('/profile')
    }
  } else if (authStore.provider && redirect === '/provider/profile') {
    // Existing provider trying to register - go to dashboard
    router.push('/provider/dashboard')
  } else if (redirect) {
    // Other specific redirects - respect them
    router.push(redirect)
  } else if (authStore.provider) {
    // No redirect, existing provider - go to dashboard
    router.push('/provider/dashboard')
  } else {
    // No redirect, customer or new user
    if (authStore.customer && authStore.customer.name && authStore.customer.phone) {
      // Complete customer profile - go to booking
      router.push('/booking')
    } else {
      // New user or incomplete profile - go to profile
      router.push('/profile')
    }
  }
}
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-6">
    <div class="max-w-md w-full">
      <!-- Logo/Brand -->
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold text-primary-600 mb-2 tracking-tight">Levi</h1>
        <p class="text-gray-500 text-lg">{{ subtitle }}</p>
      </div>

      <LoginForm @success="handleLoginSuccess" />
    </div>
  </div>
</template>

