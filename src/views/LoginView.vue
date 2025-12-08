<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const otpCode = ref('')
const codeSent = ref(false)

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
    return 'Business Management'
  }
  return 'Appointment Scheduling'
})

onMounted(async () => {
  // If already authenticated, redirect to home
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  }
})

async function sendCode() {
  if (!email.value) return
  
  try {
    await authStore.sendOtpCode(email.value)
    codeSent.value = true
  } catch (error) {
    console.error('Failed to send code:', error)
  }
}

async function verifyCode() {
  if (!email.value || !otpCode.value) return
  
  try {
    await authStore.verifyOtpCode(email.value, otpCode.value)
    
    // Success - determine where to redirect
    const redirect = route.query.redirect as string
    
    // Smart redirect logic
    if (redirect === '/provider') {
      // Provider redirect - existing provider goes to dashboard, new provider to registration
      if (authStore.provider) {
        router.push('/provider/dashboard')
      } else {
        router.push('/provider/register')
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
    } else if (authStore.provider && redirect === '/provider/register') {
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
  } catch (error) {
    console.error('Verification failed:', error)
  }
}

function goBack() {
  codeSent.value = false
  otpCode.value = ''
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

      <!-- Login Card -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <!-- Step 1: Email Input -->
        <div v-if="!codeSent">
          <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Log In</h2>

          <!-- Error Message -->
          <div v-if="authStore.error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {{ authStore.error }}
          </div>

          <form @submit.prevent="sendCode" class="space-y-6">
            <div>
              <div class="relative">
                <input
                  v-model="email"
                  type="email"
                  required
                  placeholder="Email Address"
                  class="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400"
                  :disabled="authStore.loading"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              :disabled="authStore.loading || !email"
              class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <div v-if="authStore.loading" class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ authStore.loading ? 'Sending...' : 'Send Code' }}</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-8">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-white text-gray-500">We'll email you a verification code</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Code Input -->
        <div v-else>
          <button
            @click="goBack"
            class="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center text-sm"
          >
            ← Change Email
          </button>

          <h2 class="text-2xl font-bold text-gray-900 mb-2 text-center">Enter Code</h2>
          <p class="text-gray-600 mb-6 text-center">We sent a code to <span class="font-semibold">{{ email }}</span></p>

          <!-- Error Message -->
          <div v-if="authStore.error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {{ authStore.error }}
          </div>

          <form @submit.prevent="verifyCode" class="space-y-6">
            <div>
              <input
                v-model="otpCode"
                type="text"
                required
                placeholder="Enter 6-digit code"
                maxlength="6"
                pattern="[0-9]{6}"
                class="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 text-center text-2xl tracking-widest font-mono"
                :disabled="authStore.loading"
                autofocus
              />
            </div>

            <button
              type="submit"
              :disabled="authStore.loading || otpCode.length !== 6"
              class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <div v-if="authStore.loading" class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ authStore.loading ? 'Verifying...' : 'Verify Code' }}</span>
            </button>
          </form>

          <!-- Resend Code -->
          <div class="mt-6 text-center">
            <button
              @click="sendCode"
              :disabled="authStore.loading"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              Didn't receive it? Resend code
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
