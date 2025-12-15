<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/useAuthStore'
import ImageUpload from '../../components/ImageUpload.vue'
import { saveProvider } from '../../services/providerService'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  business_name: '',
  description: '',
  phone: '',
  logo_url: null as string | null
})

const logoFile = ref<File | null>(null)

const loading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const isEditing = computed(() => !!authStore.provider)

// Populate form when data is available
function populateForm() {
  if (authStore.provider) {
    form.value = {
      business_name: authStore.provider.business_name || '',
      phone: authStore.provider.phone || '',
      description: authStore.provider.description || '',
      logo_url: authStore.provider.logo_url || null
    }
  }
}

onMounted(() => {
  populateForm()
})

// Watch for store changes (in case of page reload)
watch(
  () => authStore.provider,
  (newProvider) => {
    if (newProvider) {
      populateForm()
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (!authStore.user) return

  loading.value = true
  error.value = null

  try {
    await saveProvider({
      user: authStore.user,
      provider: authStore.provider,
      form: form.value,
      logoFile: logoFile.value
    })

    successMessage.value = isEditing.value
      ? 'Profile updated successfully'
      : 'Profile created successfully'

    await authStore.fetchProviderProfile()

    if (!isEditing.value) {
      router.push('/provider/dashboard')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save changes'
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center">
        <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {{ isEditing ? 'Business Profile' : 'Become a Provider' }}
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        {{ isEditing ? 'Manage your business details' : 'Start managing your business with Levi today.' }}
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="handleSubmit">
           <div v-if="successMessage" class="rounded-md bg-green-50 p-4 mb-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-green-800">{{ successMessage }}</h3>
                </div>
              </div>
            </div>

            <div>
              <ImageUpload
                v-model="form.logo_url"
                label="Business Logo"
                help-text="Upload a logo for your business (optional)"
                :processing="loading"
                @change="file => logoFile = file"
              />
            </div>

          <div>
            <label for="business_name" class="block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <div class="mt-1">
              <input
                id="business_name"
                v-model="form.business_name"
                name="business_name"
                type="text"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="e.g. Elite Cuts"
              />
            </div>
          </div>

          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div class="mt-1">
              <input
                id="phone"
                v-model="form.phone"
                name="phone"
                type="tel"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div class="mt-1">
              <textarea
                id="description"
                v-model="form.description"
                name="description"
                rows="3"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Tell us about your services..."
              ></textarea>
            </div>
          </div>

          <div v-if="error" class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
              </div>
            </div>
          </div>

          <div>
            <!-- New Provider: Save and Continue -->
            <button
              v-if="!isEditing"
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Saving...' : 'Save and Continue' }}
            </button>

            <!-- Existing Provider: Save & Close -->
            <template v-else>
              <button
                type="submit"
                :disabled="loading"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading ? 'Saving...' : 'Save' }}
              </button>
              
              <button
                type="button"
                @click="router.push('/provider/dashboard')"
                class="mt-3 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Close
              </button>
            </template>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
