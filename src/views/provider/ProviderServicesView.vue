<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useServiceStore } from '../../stores/useServiceStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useCategoryStore } from '../../stores/useCategoryStore'
import { useRouter } from 'vue-router'
import type { Service } from '../../types'
import ServiceFormModal from '../../components/provider/ServiceFormModal.vue'

const serviceStore = useServiceStore()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const router = useRouter()

const showModal = ref(false)
const editingService = ref<Service | null>(null)
const searchQuery = ref('')
const categoryFilter = ref('All')
const saving = ref(false)

// Categories from store
const categories = computed(() => {
  return ['All', ...categoryStore.categories.map(c => c.name)]
})

// Filtered services
const filteredServices = computed(() => {
  return serviceStore.services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const serviceCategoryName = service.categories?.name || 'Uncategorized'
    const matchesCategory = categoryFilter.value === 'All' || serviceCategoryName === categoryFilter.value
    // Only show services belonging to this provider
    const matchesProvider = service.provider_id === authStore.provider?.id
    return matchesSearch && matchesCategory && matchesProvider
  })
})

onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await Promise.all([
    serviceStore.fetchAllServices(authStore.provider.id),
    categoryStore.fetchCategories()
  ])
})

function openAddModal() {
  editingService.value = null
  showModal.value = true
}

function openEditModal(service: Service) {
  editingService.value = { ...service }
  showModal.value = true
}

async function handleSave(serviceData: any) {
  saving.value = true
  try {
    if (editingService.value) {
      await serviceStore.updateService(editingService.value.id, serviceData)
    } else {
      const newService = {
        ...serviceData,
        // Sanitize: Postgres might complain if category_id is empty string for UUID column
        category_id: serviceData.category_id || null, 
        price: parseFloat(serviceData.price), // Ensure number
        provider_id: authStore.provider?.id,
        active: true
      }
      await serviceStore.createService(newService)
    }
    showModal.value = false
    // await serviceStore.fetchAllServices(authStore.provider?.id) // Removed: Store handles local updates now
  } catch (err) {
    console.error('Error in handleSave:', err)
    alert('Failed to save service: ' + (err instanceof Error ? err.message : String(err)))
  } finally {
    saving.value = false
  }
}

async function toggleActive(service: Service) {
  await serviceStore.updateService(service.id, { active: !service.active })
  // No need to refetch - updateService already updates local state
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
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
            <h1 class="text-2xl font-bold text-gray-900">My Services</h1>
          </div>
          <button
            @click="openAddModal"
            class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Service
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="relative w-full md:w-96">
          <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search services..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div class="flex items-center gap-2 w-full md:w-auto">
          <label class="text-gray-600 whitespace-nowrap">Category:</label>
          <select
            v-model="categoryFilter"
            class="w-full md:w-48 border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="serviceStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="text-gray-500 mt-4">Loading services...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredServices.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900">No services found</h3>
        <p class="text-gray-500 mt-2">Get started by adding your first service.</p>
        <button
          @click="openAddModal"
          class="mt-4 text-primary-600 hover:text-primary-700 font-medium"
        >
          Add Service →
        </button>
      </div>

      <!-- Services Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="service in filteredServices"
          :key="service.id"
          class="bg-white rounded-lg shadow hover:shadow-md transition-shadow border overflow-hidden"
          :class="service.active ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-75'"
        >
          <div class="p-6">
            <!-- Inactive banner -->
            <div v-if="!service.active" class="mb-3 -mx-6 -mt-6 px-6 py-2 bg-gray-200 border-b border-gray-300">
              <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                ⚠️ Inactive Service
              </span>
            </div>
            
            <div class="flex justify-between items-start mb-4">
              <div>
                <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full mb-2"
                  :class="service.active ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'">
                  {{ service.categories?.name || 'Uncategorized' }}
                </span>
                <h3 class="text-xl font-bold" :class="service.active ? 'text-gray-900' : 'text-gray-600'">
                  {{ service.name }}
                </h3>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-lg font-bold" :class="service.active ? 'text-primary-600' : 'text-gray-500'">
                  {{ formatCurrency(service.price || 0) }}
                </span>
                <span class="text-sm" :class="service.active ? 'text-gray-500' : 'text-gray-400'">
                  {{ service.duration }} min
                </span>
              </div>
            </div>
            
            <p class="text-sm mb-4 line-clamp-2" :class="service.active ? 'text-gray-600' : 'text-gray-500'">
              {{ service.description || 'No description provided.' }}
            </p>

            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
              <!-- Toggle Switch -->
              <div class="flex items-center gap-3">
                <button
                  @click="toggleActive(service)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  :class="service.active ? 'bg-green-600' : 'bg-gray-300'"
                  :title="service.active ? 'Click to deactivate' : 'Click to activate'"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="service.active ? 'translate-x-6' : 'translate-x-1'"
                  ></span>
                </button>
                <span class="text-sm font-medium" :class="service.active ? 'text-green-600' : 'text-gray-500'">
                  {{ service.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              
              <div class="flex gap-2">
                <button
                  @click="openEditModal(service)"
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Edit service"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Form Modal -->
    <ServiceFormModal
      v-if="showModal"
      :service="editingService"
      :loading="saving"
      @close="showModal = false"
      @save="handleSave"
    />
  </div>
</template>
