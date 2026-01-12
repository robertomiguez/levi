<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCategoryStore } from '../../stores/useCategoryStore'
import { useStaffStore } from '../../stores/useStaffStore'
import { useAuthStore } from '../../stores/useAuthStore'
import Modal from '../../components/common/Modal.vue'

const props = defineProps<{
  service: any // Temporarily using any to debug potential type import issues
  loading?: boolean
}>()

console.log('ServiceFormModal mounted', props.service)

const emit = defineEmits(['close', 'save'])
const categoryStore = useCategoryStore()
const staffStore = useStaffStore()
const authStore = useAuthStore()

const form = ref({
  name: '',
  category_id: '',
  price: 0,
  duration: 30,
  description: '',
  buffer_before: 0,
  buffer_after: 0,
  staff_ids: [] as string[]
})

onMounted(async () => {
  const promises = []
  
  // Only fetch if we don't have categories yet
  if (categoryStore.categories.length === 0) {
    promises.push(categoryStore.fetchCategories())
  }
  
  if (authStore.provider && staffStore.staff.length === 0) {
    promises.push(staffStore.fetchStaff(authStore.provider.id))
  }
  
  await Promise.all(promises)
  
  if (props.service) {
    form.value = {
      name: props.service.name,
      category_id: props.service.category_id || '',
      price: props.service.price || 0,
      duration: props.service.duration,
      description: props.service.description || '',
      buffer_before: props.service.buffer_before || 0,
      buffer_after: props.service.buffer_after || 0,
      staff_ids: props.service.staff?.map((s: any) => s.id) || []
    }
  } else {
    // For new services, verify we have a valid initial state
    if (categoryStore.categories.length > 0) {
      // Default to first category
      form.value.category_id = categoryStore.categories[0]?.id || ''
    }
  }
})

function handleSubmit() {
  console.log('Submitting form:', form.value)
  emit('save', form.value)
}
</script>

<template>
  <Modal
    :is-open="true"
    :title="service ? $t('modals.service.title_edit') : $t('modals.service.title_new')"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.name') }}</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          :placeholder="$t('modals.service.name_placeholder')"
        />
      </div>

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.category') }}</label>
        <select
          v-model="form.category_id"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="" disabled>{{ $t('modals.service.category_placeholder') }}</option>
          <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Price -->
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.price') }}</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              v-model="form.price"
              type="number"
              min="0"
              step="0.01"
              required
              class="block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        <!-- Duration -->
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.duration') }}</label>
          <input
            v-model="form.duration"
            type="number"
            min="5"
            step="5"
            required
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.description') }}</label>
        <textarea
          v-model="form.description"
          rows="3"
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          :placeholder="$t('modals.service.description_placeholder')"
        ></textarea>
      </div>

      <!-- Staff Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('modals.service.assign_staff') }}</label>
        <div class="border border-gray-300 rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
          <div v-if="staffStore.staff.length === 0" class="text-sm text-gray-500 italic px-2">
            {{ $t('modals.service.no_staff') }}
          </div>
          <div v-for="member in staffStore.staff" :key="member.id" class="flex items-center">
            <input
              :id="'staff-' + member.id"
              type="checkbox"
              :value="member.id"
              v-model="form.staff_ids"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label :for="'staff-' + member.id" class="ml-2 block text-sm text-gray-900 select-none cursor-pointer flex-1">
              {{ member.name }}
            </label>
          </div>
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ $t('modals.service.assign_staff_help') }}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Buffer Before -->
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.buffer_before') }}</label>
          <input
            v-model="form.buffer_before"
            type="number"
            min="0"
            step="5"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <!-- Buffer After -->
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('modals.service.buffer_after') }}</label>
          <input
            v-model="form.buffer_after"
            type="number"
            min="0"
            step="5"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <button
          type="submit"
          :disabled="props.loading"
          class="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="props.loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ props.loading ? $t('modals.service.saving') : $t('modals.service.save_button') }}
        </button>
        <button
          type="button"
          class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
          @click="$emit('close')"
        >
          {{ $t('common.cancel') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
