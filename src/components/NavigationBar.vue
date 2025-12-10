<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const showMobileMenu = ref(false)
const showUserDropdown = ref(false)

const userRole = computed(() => {
  const isProvider = authStore.provider !== null
  const isCustomer = authStore.customer !== null
  
  if (isProvider && isCustomer) return 'Both'
  if (isProvider) return 'Provider'
  if (isCustomer) return 'Customer'
  return null
})

const userName = computed(() => {
  if (authStore.provider) return authStore.provider.business_name
  if (authStore.customer) return authStore.customer.name || 'Customer'
  return authStore.user?.email || 'User'
})

const userInitials = computed(() => {
  const name = userName.value
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const roleBadgeColor = computed(() => {
  switch (userRole.value) {
    case 'Provider': return 'bg-purple-100 text-purple-800'
    case 'Customer': return 'bg-blue-100 text-blue-800'  
    case 'Both': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
})

function navigateToForBusiness() {
  // If user is already a provider, go to dashboard
  if (authStore.provider) {
    router.push('/provider/dashboard')
  } else {
    // Otherwise, show the For Business landing page
    router.push('/for-business')
  }
}

function navigateToLogin() {
  router.push('/login')
}

function navigateToDashboard() {
  if (authStore.provider) {
    router.push('/provider/dashboard')
  } else {
    router.push('/booking')
  }
}

function navigateToProfile() {
  if (authStore.provider) {
    router.push('/provider/profile')
  } else {
    router.push('/profile')
  }
}

async function handleLogout() {
  await authStore.signOut()
  showUserDropdown.value = false
  router.push('/')
}

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function toggleUserDropdown() {
  showUserDropdown.value = !showUserDropdown.value
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.user-dropdown')) {
    showUserDropdown.value = false
  }
}
</script>

<template>
  <nav class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm" @click="handleClickOutside">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <button @click="router.push('/')" class="flex items-center">
            <span class="text-2xl font-bold text-primary-600">Levi</span>
          </button>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center gap-4">
          <!-- For Business Button -->
          <button
            @click="navigateToForBusiness"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            For Business
          </button>

          <!-- User Menu -->
          <div v-if="authStore.isAuthenticated" class="relative user-dropdown">
            <button
              @click="toggleUserDropdown"
              class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <!-- Avatar -->
              <div class="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {{ userInitials }}
              </div>
              <!-- Name & Role -->
              <div class="flex flex-col items-start">
                <span class="text-sm font-medium text-gray-900">{{ userName }}</span>
                <span v-if="userRole" :class="['text-xs px-1.5 py-0.5 rounded-full font-medium', roleBadgeColor]">
                  {{ userRole }}
                </span>
              </div>
              <!-- Chevron -->
              <svg 
                class="w-4 h-4 text-gray-500 transition-transform"
                :class="{ 'rotate-180': showUserDropdown }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showUserDropdown"
              class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
            >
              <div class="px-4 py-3 border-b border-gray-100">
                <p class="text-sm font-medium text-gray-900">{{ userName }}</p>
                <p class="text-xs text-gray-500">{{ authStore.user?.email }}</p>
              </div>
              
              <button
                v-if="authStore.provider"
                @click="navigateToDashboard(); showUserDropdown = false"
                class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Dashboard
              </button>

              <button
                @click="navigateToProfile(); showUserDropdown = false"
                class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                {{ authStore.provider ? 'Business Profile' : 'Profile' }}
              </button>

              <hr class="my-1">

              <button
                @click="handleLogout"
                class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Logout
              </button>
            </div>
          </div>

          <!-- Login Button (when not authenticated) -->
          <button
            v-else
            @click="navigateToLogin"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Login
          </button>
        </div>

        <!-- Mobile Menu Button -->
        <div class="md:hidden">
          <button
            @click="toggleMobileMenu"
            class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <svg v-if="!showMobileMenu" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="showMobileMenu" class="md:hidden border-t border-gray-200 bg-white">
      <div class="px-4 py-3 space-y-2">
        <!-- User Info (if authenticated) -->
        <div v-if="authStore.isAuthenticated" class="pb-3 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
              {{ userInitials }}
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ userName }}</p>
              <p class="text-xs text-gray-500">{{ authStore.user?.email }}</p>
              <span v-if="userRole" :class="['inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1', roleBadgeColor]">
                {{ userRole }}
              </span>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <button
          @click="navigateToForBusiness(); showMobileMenu = false"
          class="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          For Business
        </button>

        <template v-if="authStore.isAuthenticated">
          <button
            v-if="authStore.provider"
            @click="navigateToDashboard(); showMobileMenu = false"
            class="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            Dashboard
          </button>

          <button
            @click="navigateToProfile(); showMobileMenu = false"
            class="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            {{ authStore.provider ? 'Business Profile' : 'Profile' }}
          </button>

          <button
            @click="handleLogout(); showMobileMenu = false"
            class="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
          </button>
        </template>

        <button
          v-else
          @click="navigateToLogin(); showMobileMenu = false"
          class="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          Login
        </button>
      </div>
    </div>
  </nav>
</template>
