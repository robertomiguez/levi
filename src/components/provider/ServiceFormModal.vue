<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCategoryStore } from '../../stores/useCategoryStore'
import Modal from '../../components/common/Modal.vue'

const props = defineProps<{
  service: any // Temporarily using any to debug potential type import issues
  loading?: boolean
}>()

console.log('ServiceFormModal mounted', props.service)

const emit = defineEmits(['close', 'save'])
const categoryStore = useCategoryStore()

const form = ref({
  name: '',
  category_id: '',
  price: 0,
  duration: 30,
  description: '',
  buffer_before: 0,
  buffer_after: 0
})

onMounted(async () => {
  // Only fetch if we don't have categories yet
  if (categoryStore.categories.length === 0) {
    await categoryStore.fetchCategories()
  }
  
  if (props.service) {
    form.value = {
      name: props.service.name,
      category_id: props.service.category_id || '',
      price: props.service.price || 0,
      duration: props.service.duration,
      description: props.service.description || '',
      buffer_before: props.service.buffer_before || 0,
      buffer_after: props.service.buffer_after || 0
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
    :title="service ? 'Edit Service' : 'Add New Service'"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Service Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder="e.g. Men's Haircut"
        />
      </div>

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Category</label>
        <select
          v-model="form.category_id"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="" disabled>Select a category</option>
          <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Price -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Price ($)</label>
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
          <label class="block text-sm font-medium text-gray-700">Duration (min)</label>
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
        <label class="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder="Describe the service..."
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Buffer Before -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Buffer Before (min)</label>
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
          <label class="block text-sm font-medium text-gray-700">Buffer After (min)</label>
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
          {{ props.loading ? 'Saving...' : 'Save Service' }}
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
