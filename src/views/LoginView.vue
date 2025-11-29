<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const linkSent = ref(false)

onMounted(async () => {
  // If already authenticated, redirect to home
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})

async function handleMagicLinkLogin() {
  if (!email.value) return
  
  try {
    await authStore.signInWithMagicLink(email.value)
    linkSent.value = true
  } catch (error) {
    console.error('Login failed:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-6">
    <div class="max-w-md w-full">
      <!-- Logo/Brand -->
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold text-primary-600 mb-2 tracking-tight">Levi</h1>
        <p class="text-gray-500 text-lg">Appointment Scheduling</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <!-- Success Message - Link Sent -->
        <div v-if="linkSent" class="text-center">
          <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p class="text-gray-600 mb-6">We've sent a magic link to <span class="font-semibold">{{ email }}</span></p>
          <p class="text-sm text-gray-500 mb-6">Click the link in your email to sign in. You can close this page.</p>
          <button
            @click="linkSent = false; email = ''"
            class="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Use a different email
          </button>
        </div>

        <!-- Login Form -->
        <div v-else>
          <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Log In</h2>

          <!-- Error Message -->
          <div v-if="authStore.error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {{ authStore.error }}
          </div>

          <form @submit.prevent="handleMagicLinkLogin" class="space-y-6">
            <div>
              <div class="relative">
                <input
                  v-model="email"
                  type="email"
                  required
                  placeholder="Username or Email"
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
              <span>{{ authStore.loading ? 'Sending...' : 'Login' }}</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-8">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-white text-gray-500">We'll email you a magic link to sign in</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
