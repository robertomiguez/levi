<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Staff, ProviderAddress } from '../../types'
import Modal from '../../components/common/Modal.vue'

const props = defineProps<{
  isOpen: boolean
  staff: Staff | null
  providerAddresses: ProviderAddress[]
  initialAddressIds: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { 
    name: string
    email: string
    role: 'admin' | 'staff'
    active: boolean
    addressIds: string[] 
  }): void
}>()

const form = ref({
  name: '',
  email: '',
  role: 'staff' as 'admin' | 'staff',
  active: true
})

const selectedAddressIds = ref<string[]>([])

// Initialize form when staff prop changes or modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.staff) {
      form.value = {
        name: props.staff.name,
        email: props.staff.email,
        role: props.staff.role,
        active: props.staff.active
      }
      // Initialize with passed address IDs
      selectedAddressIds.value = [...props.initialAddressIds]
    } else {
      // Reset for new staff
      form.value = {
        name: '',
        email: '',
        role: 'staff',
        active: true
      }
      // Default: select all addresses for new staff
      selectedAddressIds.value = props.providerAddresses.map(a => a.id)
    }
  }
})

// Watch initialAddressIds for updates if they load after modal opens (just in case)
watch(() => props.initialAddressIds, (newVal) => {
  if (props.staff && props.isOpen) {
    selectedAddressIds.value = [...newVal]
  }
})

const isEditMode = computed(() => !!props.staff)
const title = computed(() => isEditMode.value ? 'Edit Staff Member' : 'Add Staff Member')

function handleSubmit() {
  emit('save', {
    ...form.value,
    addressIds: selectedAddressIds.value
  })
}
</script>

<template>
  <Modal
    :is-open="isOpen"
    :title="title"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Role</label>
        <select
          v-model="form.role"
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div class="flex items-center">
        <input
          v-model="form.active"
          type="checkbox"
          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label class="ml-2 block text-sm text-gray-900">Active</label>
      </div>

      <!-- Work Locations (Branches) -->
      <div v-if="providerAddresses.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-2">Work Locations</label>
        <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
          <div v-for="address in providerAddresses" :key="address.id" class="flex items-start">
            <input
              :id="'addr-' + address.id"
              type="checkbox"
              :value="address.id"
              v-model="selectedAddressIds"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
            />
            <label :for="'addr-' + address.id" class="ml-2 text-sm text-gray-700 select-none cursor-pointer">
              <span class="font-medium">{{ address.label || 'Location' }}</span>
              <span class="text-gray-500 block text-xs">{{ address.street_address }}, {{ address.city }}</span>
            </label>
          </div>
        </div>
        <p v-if="selectedAddressIds.length === 0" class="mt-1 text-xs text-red-500">
          Please select at least one work location.
        </p>
      </div>

      <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <button
          type="submit"
          :disabled="loading || (providerAddresses.length > 0 && selectedAddressIds.length === 0)"
          class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
        <button
          type="button"
          class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
          @click="$emit('close')"
        >
          Cancel
        </button>
      </div>
    </form>
  </Modal>
</template>
