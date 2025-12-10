<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const name = ref('')
const phone = ref('')
const loading = ref(false)
const successMessage = ref('')

function populateForm() {
  if (authStore.customer) {
    name.value = authStore.customer.name || ''
    phone.value = authStore.customer.phone || ''
  }
}

onMounted(() => {
  populateForm()
})

watch(
  () => authStore.customer,
  (newCustomer) => {
    if (newCustomer) {
      populateForm()
    }
  },
  { immediate: true }
)

async function updateProfile() {
  const isNewUser = !authStore.customer
  loading.value = true
  successMessage.value = ''
  
  try {
    // If no customer profile exists, create one with the current form data
    if (isNewUser) {
      await authStore.createCustomerProfile({
        name: name.value,
        phone: phone.value
      })
    } else {
      // Otherwise update existing profile
      await authStore.updateProfile({
        name: name.value,
        phone: phone.value
      })
    }
    
    successMessage.value = 'Profile updated successfully!'
    
    if (isNewUser) {
      router.push('/booking')
    }

  } catch (error) {
    console.error('Failed to update profile:', error)
    alert('Failed to update profile: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
        <p class="text-gray-600">Please update your details to continue</p>
      </div>

      <div v-if="successMessage" class="bg-green-50 text-green-800 p-4 rounded-lg mb-6 text-center">
        {{ successMessage }}
      </div>

      <div v-if="authStore.error" class="bg-red-50 text-red-800 p-4 rounded-lg mb-6 text-center">
        {{ authStore.error }}
      </div>

      <form @submit.prevent="updateProfile" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="John Doe"
            class="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            v-model="phone"
            type="tel"
            required
            placeholder="(555) 123-4567"
            class="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div class="space-y-3">
          <!-- New User: Save and Continue -->
          <button
            v-if="!authStore.customer"
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <div v-if="loading" class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{{ loading ? 'Saving...' : 'Save and Continue' }}</span>
          </button>

          <!-- Existing User: Save & Close -->
          <template v-else>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <div v-if="loading" class="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ loading ? 'Saving...' : 'Save' }}</span>
            </button>

            <button
              type="button"
              @click="router.push('/booking')"
              class="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-md border border-gray-300 transition-all shadow-sm"
            >
              Close
            </button>
          </template>
        </div>
      </form>
    </div>
  </div>
</template>
