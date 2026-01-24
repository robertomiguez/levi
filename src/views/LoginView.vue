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
  if (redirect && redirect.startsWith('/provider')) {
    return 'provider'
  }
  return route.query.context as string || 'customer'
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const subtitle = computed(() => {
  if (loginContext.value === 'provider') {
    return t('auth.context.provider')
  }
  return t('auth.context.customer')
})

onMounted(async () => {
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  }
})

function handleLoginSuccess() {
  const redirect = route.query.redirect as string
  
  if (redirect === '/provider') {
    if (authStore.provider) {
      router.push('/provider/dashboard')
    } else {
      router.push('/provider/profile')
    }
  } else if (redirect === '/customer') {
    if (authStore.customer && authStore.customer.name && authStore.customer.phone) {
      router.push('/booking')
    } else {
      router.push('/profile')
    }
  } else if (authStore.provider && redirect === '/provider/profile') {
    router.push('/provider/dashboard')
  } else if (redirect) {
    router.push(redirect)
  } else if (authStore.provider) {
    router.push('/provider/dashboard')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
    <!-- Left Panel (Testimonial/Branding) -->
    <div 
      class="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex bg-cover bg-center"
      style="background-image: url('/src/assets/images/hero_barber_service_1765116285430.png');"
    >
      <div class="absolute inset-0 bg-black/60" />
      <div class="relative z-20 flex items-center text-lg font-medium">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mr-2 h-6 w-6"
        >
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
        Levi Inc
      </div>
      <div class="relative z-20 mt-auto">
        <blockquote class="space-y-2">
          <p class="text-lg">
            &ldquo;This platform completely changed how we run our barbershop. Bookings are automatic, no more WhatsApp chaos, and clients love how easy it is to schedule. We’ve reduced no-shows and filled more slots without extra work. Honestly, it paid for itself in the first month.&rdquo;
          </p>
          <footer class="text-sm">Carlos M., Owner of Urban Cut Barbershop.</footer>
        </blockquote>
      </div>
    </div>

    <!-- Right Panel (Login Form) -->
    <div class="p-8 lg:p-8">
      <div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div class="flex flex-col space-y-2 text-center">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ $t('auth.login') }}
          </h1>
          <p class="text-sm text-muted-foreground">
            Enter your email below to receive a one-time password
          </p>
        </div>
        
        <LoginForm @success="handleLoginSuccess" :embedded="true" />
        
        <p class="px-8 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our
          <a href="/terms" class="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>
          and
          <a href="/privacy" class="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  </div>
</template>
