<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { Availability, BlockedDate, Staff } from '../../types'

const authStore = useAuthStore()
const router = useRouter()

const staff = ref<Staff[]>([])
const selectedStaffId = ref<string>('')
const weeklySchedule = ref<Availability[]>([])
const blockedDates = ref<BlockedDate[]>([])
const loading = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const daysOfWeek = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await fetchStaff()
})

async function fetchStaff() {
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('provider_id', authStore.provider?.id)
    .eq('active', true)
    .order('name')
  
  staff.value = data || []
  if (staff.value.length > 0) {
    const firstStaff = staff.value[0]
    if (firstStaff) {
      selectedStaffId.value = firstStaff.id
      await fetchSchedule()
    }
  }
}

async function fetchSchedule() {
  if (!selectedStaffId.value) return
  loading.value = true
  // Don't clear messages here, as it may be called after a save operation
  
  try {
    // Fetch weekly availability
    const { data: availData } = await supabase
      .from('availability')
      .select('*')
      .eq('staff_id', selectedStaffId.value)
      .order('day_of_week')

    // Fetch blocked dates
    const { data: blockedData } = await supabase
      .from('blocked_dates')
      .select('*')
      .eq('staff_id', selectedStaffId.value)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date')

    // Initialize schedule if empty
    if (!availData || availData.length === 0) {
      weeklySchedule.value = daysOfWeek.map((_, index) => ({
        id: `temp-${index}`,
        staff_id: selectedStaffId.value,
        provider_id: authStore.provider?.id,
        day_of_week: index,
        start_time: '09:00',
        end_time: '17:00',
        is_available: index >= 1 && index <= 5 // Mon-Fri default
      }))
    } else {
      // Merge with defaults to ensure all days exist
      weeklySchedule.value = daysOfWeek.map((_, index) => {
        const existing = availData.find(a => a.day_of_week === index)
        return existing || {
          id: `temp-${index}`,
          staff_id: selectedStaffId.value,
          provider_id: authStore.provider?.id,
          day_of_week: index,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        }
      })
    }

    blockedDates.value = blockedData || []
  } catch (e) {
    console.error('Error fetching schedule:', e)
    errorMessage.value = 'Failed to load schedule'
  } finally {
    loading.value = false
  }
}

function onStaffChange() {
  successMessage.value = null
  errorMessage.value = null
  fetchSchedule()
}

async function saveSchedule() {
  loading.value = true
  successMessage.value = null
  errorMessage.value = null
  
  try {
    // Upsert availability
    const updates = weeklySchedule.value.map(slot => {
      const { id, ...data } = slot
      // Remove temp IDs
      return String(id).startsWith('temp-') ? data : slot
    })

    const { error } = await supabase
      .from('availability')
      .upsert(updates)

    if (error) throw error
    successMessage.value = 'Schedule saved successfully!'
    await fetchSchedule()
  } catch (e) {
    console.error('Error saving schedule:', e)
    errorMessage.value = 'Failed to save schedule'
  } finally {
    loading.value = false
  }
}

// Blocked Dates Logic
const showBlockModal = ref(false)
const blockForm = ref({
  start_date: '',
  end_date: '',
  reason: ''
})

async function addBlockedDate() {
  successMessage.value = null
  errorMessage.value = null
  
  try {
    const { error } = await supabase
      .from('blocked_dates')
      .insert([{
        staff_id: selectedStaffId.value,
        provider_id: authStore.provider?.id,
        start_date: blockForm.value.start_date,
        end_date: blockForm.value.end_date,
        reason: blockForm.value.reason
      }])

    if (error) throw error
    showBlockModal.value = false
    blockForm.value = { start_date: '', end_date: '', reason: '' }
    successMessage.value = 'Time off added successfully'
    await fetchSchedule()
  } catch (e) {
    console.error('Error adding blocked date:', e)
    errorMessage.value = 'Failed to add blocked date'
  }
}

async function deleteBlockedDate(id: string) {
  if (!confirm('Are you sure you want to remove this blocked date?')) return
  successMessage.value = null
  errorMessage.value = null
  
  try {
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', id)

    if (error) throw error
    successMessage.value = 'Time off removed successfully'
    await fetchSchedule()
  } catch (e) {
    console.error('Error deleting blocked date:', e)
    errorMessage.value = 'Failed to remove blocked date'
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4 w-full sm:w-auto">
            <button @click="router.push('/provider/dashboard')" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Availability & Hours</h1>
          </div>
          <div class="flex flex-wrap justify-end items-center gap-4 w-full sm:w-auto">
            <select 
              v-model="selectedStaffId" 
              @change="onStaffChange"
              class="border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option v-for="member in staff" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
            <button
              @click="saveSchedule"
              class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              :disabled="loading"
            >
              <span v-if="loading">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      
      <!-- Status Messages -->
      <div v-if="successMessage" class="rounded-md bg-green-50 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">{{ successMessage }}</h3>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="rounded-md bg-red-50 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ errorMessage }}</h3>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Weekly Schedule -->
        <div class="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-bold text-gray-900">Weekly Schedule</h2>
            <p class="text-sm text-gray-500">Set regular working hours for this staff member.</p>
          </div>
          
          <div class="divide-y divide-gray-200">
            <div v-for="(day, index) in weeklySchedule" :key="index" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4">
              <div class="flex items-center gap-4 w-full sm:w-1/3">
                <input 
                  type="checkbox" 
                  v-model="day.is_available"
                  class="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                >
                <span class="font-medium text-gray-900" :class="{'text-gray-400': !day.is_available}">
                  {{ daysOfWeek[day.day_of_week] }}
                </span>
              </div>

              <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto" v-if="day.is_available">
                <input 
                  type="time" 
                  v-model="day.start_time"
                  class="border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500 w-32"
                >
                <span class="text-gray-500">to</span>
                <input 
                  type="time" 
                  v-model="day.end_time"
                  class="border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500 w-32"
                >
              </div>
              <div v-else class="text-gray-400 italic text-sm">
                Closed
              </div>
            </div>
          </div>
        </div>

        <!-- Blocked Dates -->
        <div class="bg-white rounded-lg shadow h-fit">
          <div class="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Time Off</h2>
              <p class="text-sm text-gray-500">Vacations & holidays</p>
            </div>
            <button 
              @click="showBlockModal = true"
              class="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              + Add Time Off
            </button>
          </div>

          <div class="p-4">
            <div v-if="blockedDates.length === 0" class="text-center py-8 text-gray-500 text-sm">
              No upcoming time off scheduled.
            </div>
            <div v-else class="space-y-3">
              <div v-for="block in blockedDates" :key="block.id" class="bg-gray-50 rounded-lg p-3 border border-gray-200 relative group">
                <button 
                  @click="deleteBlockedDate(block.id)"
                  class="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
                <p class="font-medium text-gray-900">{{ block.reason || 'Time Off' }}</p>
                <p class="text-sm text-gray-600">
                  {{ new Date(block.start_date).toLocaleDateString() }} - 
                  {{ new Date(block.end_date).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Block Date Modal -->
    <div v-if="showBlockModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showBlockModal = false"></div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Add Time Off</h3>
            <form @submit.prevent="addBlockedDate" class="mt-4 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Reason</label>
                <input v-model="blockForm.reason" type="text" required placeholder="e.g. Vacation" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Start Date</label>
                  <input v-model="blockForm.start_date" type="date" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">End Date</label>
                  <input v-model="blockForm.end_date" type="date" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm">
                  Save
                </button>
                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm" @click="showBlockModal = false">
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
