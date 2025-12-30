<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useStaffStore } from '../stores/useStaffStore'
import { useNotifications } from '../composables/useNotifications'
import ConfirmationModal from '../components/common/ConfirmationModal.vue'

const staffStore = useStaffStore()
const { showSuccess, showError } = useNotifications()

const selectedStaffId = ref<string>('')
const showBlockedDateModal = ref(false)
const blockedDateForm = ref({
  start_date: '',
  end_date: '',
  reason: ''
})

// Confirmation logic
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const pendingDeleteId = ref<string | null>(null)

function openDeleteConfirm(id: string) {
  pendingDeleteId.value = id
  confirmTitle.value = 'Remove Blocked Period'
  confirmMessage.value = 'Are you sure you want to remove this blocked period?'
  showConfirmModal.value = true
}

async function handleConfirmDelete() {
  if (!pendingDeleteId.value) return
  
  try {
    await staffStore.deleteBlockedDate(pendingDeleteId.value)
    showSuccess('Blocked period removed successfully')
  } catch (e) {
    console.error('Error deleting blocked date:', e)
    showError('Failed to delete blocked period')
  } finally {
    showConfirmModal.value = false
    pendingDeleteId.value = null
  }
}

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

interface ScheduleItem {
  enabled: boolean
  start: string
  end: string
}

const weeklySchedule = ref<ScheduleItem[]>([
  { enabled: false, start: '09:00', end: '17:00' },
  { enabled: true, start: '09:00', end: '17:00' },
  { enabled: true, start: '09:00', end: '17:00' },
  { enabled: true, start: '09:00', end: '17:00' },
  { enabled: true, start: '09:00', end: '17:00' },
  { enabled: true, start: '09:00', end: '17:00' },
  { enabled: false, start: '09:00', end: '17:00' }
])

onMounted(async () => {
  await staffStore.fetchStaff()
  if (staffStore.staff.length > 0 && staffStore.staff[0]) {
    selectedStaffId.value = staffStore.staff[0].id
    await loadStaffAvailability()
  }
})

async function loadStaffAvailability() {
  if (!selectedStaffId.value) return
  
  await staffStore.fetchAvailability(selectedStaffId.value)
  await staffStore.fetchBlockedDates(selectedStaffId.value)
  
  // Reset schedule
  weeklySchedule.value = [
    { enabled: false, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: false, start: '09:00', end: '17:00' }
  ]
  
  // Populate from database
  staffStore.availability.forEach(avail => {
    if (avail.is_available && weeklySchedule.value[avail.day_of_week]) {
      weeklySchedule.value[avail.day_of_week] = {
        enabled: true,
        start: avail.start_time.substring(0, 5),
        end: avail.end_time.substring(0, 5)
      }
    }
  })
}

async function handleStaffChange() {
  await loadStaffAvailability()
}

async function saveSchedule() {
  if (!selectedStaffId.value) return
  
  const availabilityData = []
  
  for (let day = 0; day <= 6; day++) {
    const schedule = weeklySchedule.value[day]
    if (schedule && schedule.enabled) {
      availabilityData.push({
        staff_id: selectedStaffId.value,
        day_of_week: day,
        start_time: schedule.start,
        end_time: schedule.end,
        is_available: true
      })
    }
  }
  
  try {
    await staffStore.upsertAvailability(selectedStaffId.value, availabilityData)
    showSuccess('Schedule saved successfully')
  } catch (e) {
    console.error('Error saving schedule:', e)
    showError('Failed to save schedule')
  }
}

function openBlockedDateModal() {
  blockedDateForm.value = {
    start_date: '',
    end_date: '',
    reason: ''
  }
  showBlockedDateModal.value = true
}

async function handleBlockedDateSubmit() {
  if (!selectedStaffId.value) return
  
  try {
    await staffStore.createBlockedDate({
      staff_id: selectedStaffId.value,
      start_date: blockedDateForm.value.start_date,
      end_date: blockedDateForm.value.end_date,
      reason: blockedDateForm.value.reason
    })
    showSuccess('Blocked period added')
    showBlockedDateModal.value = false
  } catch (e) {
    console.error('Error creating blocked date:', e)
    showError('Failed to add blocked period')
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto p-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Staff Availability</h1>
      <p class="text-gray-600 mb-6">Manage business hours and time off</p>

      <!-- Staff Selector -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Select Staff Member</label>
        <select 
          v-model="selectedStaffId"
          @change="handleStaffChange"
          class="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option v-for="member in staffStore.staff" :key="member.id" :value="member.id">
            {{ member.name }}
          </option>
        </select>
      </div>

      <div v-if="selectedStaffId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Weekly Schedule -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Weekly Schedule</h2>
          
          <div class="space-y-3">
            <div v-for="day in daysOfWeek" :key="day.value" class="flex items-center gap-3">
              <input 
                type="checkbox" 
                v-if="weeklySchedule[day.value]"
                v-model="weeklySchedule[day.value].enabled"
                class="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span class="w-24 text-sm font-medium text-gray-700">{{ day.label }}</span>
              
              <template v-if="weeklySchedule[day.value] && weeklySchedule[day.value].enabled">
                <input 
                  type="time"
                  v-model="weeklySchedule[day.value].start"
                  class="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span class="text-gray-500">to</span>
                <input 
                  type="time"
                  v-model="weeklySchedule[day.value].end"
                  class="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </template>
              <span v-else class="text-sm text-gray-400">Closed</span>
            </div>
          </div>

          <button
            @click="saveSchedule"
            class="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Save Schedule
          </button>
        </div>

        <!-- Blocked Dates -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-900">Blocked Dates</h2>
            <button
              @click="openBlockedDateModal"
              class="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              + Add
            </button>
          </div>

          <div v-if="staffStore.blockedDates.length > 0" class="space-y-3">
            <div
              v-for="blocked in staffStore.blockedDates"
              :key="blocked.id"
              class="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p class="text-sm font-medium text-gray-900">
                  {{ formatDate(blocked.start_date) }} - {{ formatDate(blocked.end_date) }}
                </p>
                <p v-if="blocked.reason" class="text-xs text-gray-500 mt-1">{{ blocked.reason }}</p>
              </div>
              <button
                @click="openDeleteConfirm(blocked.id)"
                class="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500 text-sm">
            No blocked dates
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-lg shadow p-12 text-center">
        <p class="text-gray-500">No staff members found. Add staff in your database.</p>
      </div>
    </div>

    <!-- Blocked Date Modal -->
    <div v-if="showBlockedDateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Add Blocked Period</h2>
          
          <form @submit.prevent="handleBlockedDateSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                v-model="blockedDateForm.start_date"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                v-model="blockedDateForm.end_date"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
              <input
                v-model="blockedDateForm.reason"
                type="text"
                placeholder="e.g., Vacation, Holiday"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div class="flex gap-3 pt-4">
              <button
                type="button"
                @click="showBlockedDateModal = false"
                class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add Blocked Period
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
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
