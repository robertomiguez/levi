<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useAddressStore } from '../../stores/useAddressStore'
import { useRouter } from 'vue-router'
import type { ProviderAddress } from '../../types'

const authStore = useAuthStore()
const addressStore = useAddressStore()
const router = useRouter()

const showModal = ref(false)
const editingAddress = ref<ProviderAddress | null>(null)

const form = ref({
  label: '',
  street_address: '',
  street_address_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'USA'
})

onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await addressStore.fetchAddresses(authStore.provider.id)
})

const primaryAddress = computed(() => 
  addressStore.addresses.find(a => a.is_primary)
)

function openAddModal() {
  editingAddress.value = null
  form.value = {
    label: '',
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA'
  }
  showModal.value = true
}

function openEditModal(address: ProviderAddress) {
  editingAddress.value = address
  form.value = {
    label: address.label || '',
    street_address: address.street_address,
    street_address_2: address.street_address_2 || '',
    city: address.city,
    state: address.state || '',
    postal_code: address.postal_code,
    country: address.country
  }
  showModal.value = true
}

async function handleSave() {
  if (!authStore.provider) return

  try {
    if (editingAddress.value) {
      await addressStore.updateAddress(editingAddress.value.id, form.value)
    } else {
      await addressStore.createAddress({
        ...form.value,
        provider_id: authStore.provider.id,
        is_primary: addressStore.addresses.length === 0 // First address is primary by default
      })
    }
    showModal.value = false
  } catch (error) {
    console.error('Error saving address:', error)
    alert('Failed to save address: ' + (error instanceof Error ? error.message : String(error)))
  }
}

async function handleDelete(id: string) {
  if (confirm('Are you sure you want to delete this address?')) {
    try {
      await addressStore.deleteAddress(id)
    } catch (error) {
      console.error('Error deleting address:', error)
      alert('Failed to delete address')
    }
  }
}

async function handleSetPrimary(id: string) {
  if (!authStore.provider) return
  try {
    await addressStore.setPrimaryAddress(id, authStore.provider.id)
  } catch (error) {
    console.error('Error setting primary address:', error)
    alert('Failed to set primary address')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button @click="router.push('/provider/dashboard')" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Service Locations</h1>
          </div>
          <button
            @click="openAddModal"
            class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Location
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="addressStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="text-gray-500 mt-4">Loading addresses...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="addressStore.addresses.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900">No service locations</h3>
        <p class="text-gray-500 mt-2">Add your first service location to let customers know where you operate.</p>
        <button
          @click="openAddModal"
          class="mt-4 text-primary-600 hover:text-primary-700 font-medium"
        >
          Add Location →
        </button>
      </div>

      <!-- Addresses Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="address in addressStore.addresses"
          :key="address.id"
          class="bg-white rounded-lg shadow hover:shadow-md transition-shadow border overflow-hidden"
          :class="address.is_primary ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200'"
        >
          <div class="p-6">
            <!-- Primary badge -->
            <div v-if="address.is_primary" class="mb-3 -mx-6 -mt-6 px-6 py-2 bg-primary-50 border-b border-primary-200">
              <span class="text-xs font-semibold text-primary-700 uppercase tracking-wide">
                ⭐ Primary Location
              </span>
            </div>

            <!-- Label -->
            <h3 class="text-lg font-bold text-gray-900 mb-3">
              {{ address.label || 'Service Location' }}
            </h3>

            <!-- Address -->
            <div class="text-gray-700 space-y-1 mb-4">
              <p>{{ address.street_address }}</p>
              <p v-if="address.street_address_2" class="text-gray-500">{{ address.street_address_2 }}</p>
              <p>{{ address.city }}<span v-if="address.state">, {{ address.state }}</span> {{ address.postal_code }}</p>
              <p class="text-gray-500">{{ address.country }}</p>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                v-if="!address.is_primary"
                @click="handleSetPrimary(address.id)"
                class="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Set as Primary
              </button>
              <span v-else class="text-sm text-gray-400">
                Primary location
              </span>
              
              <div class="flex gap-2">
                <button
                  @click="openEditModal(address)"
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Edit address"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button
                  @click="handleDelete(address.id)"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete address"
                  :disabled="address.is_primary && addressStore.addresses.length > 1"
                  :class="{ 'opacity-50 cursor-not-allowed': address.is_primary && addressStore.addresses.length > 1 }"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Address Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showModal = false"></div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              {{ editingAddress ? 'Edit Location' : 'Add Location' }}
            </h3>
            
            <form @submit.prevent="handleSave" class="mt-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Location Label (Optional)</label>
                <input
                  v-model="form.label"
                  type="text"
                  placeholder="e.g., Main Location, Downtown Branch"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Street Address *</label>
                <input
                  v-model="form.street_address"
                  type="text"
                  required
                  placeholder="123 Main St"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Apt, Suite, Floor (Optional)</label>
                <input
                  v-model="form.street_address_2"
                  type="text"
                  placeholder="Suite 200"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">City *</label>
                  <input
                    v-model="form.city"
                    type="text"
                    required
                    placeholder="New York"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">State/Province</label>
                  <input
                    v-model="form.state"
                    type="text"
                    placeholder="NY"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Postal Code *</label>
                  <input
                    v-model="form.postal_code"
                    type="text"
                    required
                    placeholder="10001"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">Country *</label>
                  <input
                    v-model="form.country"
                    type="text"
                    required
                    placeholder="USA"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="submit"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  @click="showModal = false"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
