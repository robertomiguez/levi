<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useAddressStore } from '../../stores/useAddressStore'
import { useRouter } from 'vue-router'
import type { ProviderAddress } from '../../types'
import { useModal } from '../../composables/useModal'
import { useNotifications } from '../../composables/useNotifications'
import { useI18n } from 'vue-i18n'
import Modal from '../../components/common/Modal.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'

const authStore = useAuthStore()
const addressStore = useAddressStore()
const router = useRouter()
const { t } = useI18n()
const { showSuccess, showError } = useNotifications()

const modal = useModal<ProviderAddress>()

// Confirmation logic
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const pendingDeleteId = ref<string | null>(null)

function openDeleteConfirm(id: string) {
  pendingDeleteId.value = id
  confirmTitle.value = t('provider.locations.delete_confirm_title')
  confirmMessage.value = t('provider.locations.delete_confirm_msg')
  showConfirmModal.value = true
}

async function handleConfirmDelete() {
  if (!pendingDeleteId.value) return
  
  try {
    await addressStore.deleteAddress(pendingDeleteId.value)
    showSuccess(t('provider.locations.delete_success'))
  } catch (error) {
    console.error('Error deleting address:', error)
    showError(t('provider.locations.delete_error'))
  } finally {
    showConfirmModal.value = false
    pendingDeleteId.value = null
  }
}

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

function openAddModal() {
  modal.open(null)
  form.value = {
    label: '',
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA'
  }
}

function openEditModal(address: ProviderAddress) {
  modal.open(address)
  form.value = {
    label: address.label || '',
    street_address: address.street_address,
    street_address_2: address.street_address_2 || '',
    city: address.city,
    state: address.state || '',
    postal_code: address.postal_code,
    country: address.country
  }
}

async function handleSave() {
  if (!authStore.provider) return

  try {
    if (modal.data.value) {
      await addressStore.updateAddress(modal.data.value.id, form.value)
    } else {
      await addressStore.createAddress({
        ...form.value,
        provider_id: authStore.provider.id,
        is_primary: addressStore.addresses.length === 0
      })
    }
    modal.close()
    showSuccess(t('provider.locations.save_success'))
  } catch (error) {
    console.error('Error saving address:', error)
    showError(t('provider.locations.save_error') + ': ' + (error instanceof Error ? error.message : String(error)))
  }
}

async function handleDelete(id: string) {
  openDeleteConfirm(id)
}

async function handleSetPrimary(id: string) {
  if (!authStore.provider) return
  try {
    await addressStore.setPrimaryAddress(id, authStore.provider.id)
    showSuccess(t('provider.locations.primary_update_success'))
  } catch (error) {
    console.error('Error setting primary address:', error)
    showError(t('provider.locations.primary_update_error'))
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
            <h1 class="text-2xl font-bold text-gray-900">{{ $t('provider.locations.title') }}</h1>
          </div>
          <button
            @click="openAddModal"
            class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            {{ $t('provider.locations.add_button') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="addressStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="text-gray-500 mt-4">{{ $t('provider.locations.loading') }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="addressStore.addresses.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900">{{ $t('provider.locations.no_locations') }}</h3>
        <p class="text-gray-500 mt-2">{{ $t('provider.locations.no_locations_desc') }}</p>
        <button
          @click="openAddModal"
          class="mt-4 text-primary-600 hover:text-primary-700 font-medium"
        >
          {{ $t('provider.locations.add_button') }} →
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
                ⭐ {{ $t('provider.locations.primary_badge') }}
              </span>
            </div>

            <!-- Label -->
            <h3 class="text-lg font-bold text-gray-900 mb-3">
              {{ address.label || $t('provider.locations.primary_label') }}
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
                {{ $t('provider.locations.set_primary') }}
              </button>
              <span v-else class="text-sm text-gray-400">
                {{ $t('provider.locations.primary_label') }}
              </span>
              
              <div class="flex gap-2">
                <button
                  @click="openEditModal(address)"
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  :title="$t('common.edit')"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button
                  @click="handleDelete(address.id)"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  :title="$t('common.delete')"
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
    <Modal
      :is-open="modal.isOpen.value"
      :title="modal.data.value ? $t('provider.locations.form.edit_title') : $t('provider.locations.form.add_title')"
      @close="modal.close()"
    >
      <form @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.label') }}</label>
          <input
            v-model="form.label"
            type="text"
            :placeholder="$t('provider.locations.form.label_placeholder')"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.street') }}</label>
          <input
            v-model="form.street_address"
            type="text"
            required
            :placeholder="$t('provider.locations.form.street_placeholder')"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.street2') }}</label>
          <input
            v-model="form.street_address_2"
            type="text"
            :placeholder="$t('provider.locations.form.street2_placeholder')"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.city') }}</label>
            <input
              v-model="form.city"
              type="text"
              required
              :placeholder="$t('provider.locations.form.city_placeholder')"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.state') }}</label>
            <input
              v-model="form.state"
              type="text"
              :placeholder="$t('provider.locations.form.state_placeholder')"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.postal') }}</label>
            <input
              v-model="form.postal_code"
              type="text"
              required
              :placeholder="$t('provider.locations.form.postal_placeholder')"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">{{ $t('provider.locations.form.country') }}</label>
            <input
              v-model="form.country"
              type="text"
              required
              :placeholder="$t('provider.locations.form.country_placeholder')"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        <div class="mt-5 flex gap-3 sm:justify-end">
          <button
            type="button"
            class="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
            @click="modal.close()"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
          >
            {{ $t('common.save') }}
          </button>
        </div>
      </form>
    </Modal>

    <ConfirmationModal
      :isOpen="showConfirmModal"
      :title="confirmTitle"
      :message="confirmMessage"
      :isDestructive="true"
      @close="showConfirmModal = false"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
