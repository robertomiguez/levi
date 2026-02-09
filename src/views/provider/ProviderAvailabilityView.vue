<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useAppointmentStore } from '../../stores/useAppointmentStore'
import { useRouter } from 'vue-router'
import { format, parseISO } from 'date-fns'
import * as staffService from '../../services/staffService'
import * as availabilityService from '../../services/availabilityService'
import { useNotifications } from '../../composables/useNotifications'
import { useModal } from '../../composables/useModal'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/useSettingsStore'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import Modal from '../../components/common/Modal.vue'
import type { Availability, BlockedDate, Staff } from '../../types'

const authStore = useAuthStore()
const appointmentStore = useAppointmentStore()
const router = useRouter()
const { t } = useI18n()
const settingsStore = useSettingsStore()

const daysOfWeek = computed(() => {
  const formatter = new Intl.DateTimeFormat(settingsStore.language, { weekday: 'long' })
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, i + 7) // i=0 is Sunday
    return formatter.format(date)
  })
})

const staff = ref<Staff[]>([])
const selectedStaffId = ref<string>('')
const weeklySchedule = ref<Availability[]>([])
const originalSchedule = ref<Availability[]>([])
const blockedDates = ref<BlockedDate[]>([])
const loading = ref(false)
const { successMessage, errorMessage, showSuccess, showError, clearMessages } = useNotifications()

// Confirmation logic
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const pendingDeleteId = ref<string | null>(null)
const pendingSave = ref(false)

function openDeleteConfirm(id: string) {
  pendingDeleteId.value = id
  confirmTitle.value = t('provider.availability.delete_time_off_confirm_title')
  confirmMessage.value = t('provider.availability.delete_time_off_confirm_msg')
  showConfirmModal.value = true
}
onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await fetchStaff()
})

async function fetchStaff() {
  if (!authStore.provider?.id) return
  try {
    const data = await staffService.fetchStaff(authStore.provider.id)
    const activeStaff = data.filter(s => s.active)
    
    staff.value = activeStaff || []
    if (staff.value.length > 0) {
      const firstStaff = staff.value[0]
      if (firstStaff) {
        selectedStaffId.value = firstStaff.id
        await fetchSchedule()
      }
    }
  } catch (e) {
    console.error('Error fetching staff:', e)
  }
}

function onStaffChange() {
  clearMessages()
  fetchSchedule()
}

async function fetchSchedule() {
  if (!selectedStaffId.value) return
  loading.value = true
  
  try {
    const availData = await availabilityService.fetchAvailability(selectedStaffId.value)
    const blockedData = await availabilityService.fetchBlockedDates(selectedStaffId.value)

    if (!availData || availData.length === 0) {
      weeklySchedule.value = daysOfWeek.value.map((_, index: number) => ({
        id: `temp-${index}`,
        staff_id: selectedStaffId.value,
        provider_id: authStore.provider?.id || '',
        day_of_week: index,
        start_time: '09:00',
        end_time: '17:00',
        is_available: index >= 1 && index <= 5
      }))
    } else {
      weeklySchedule.value = daysOfWeek.value.map((_, index: number) => {
        const existing = availData.find(a => a.day_of_week === index)
        return existing || {
          id: `temp-${index}`,
          staff_id: selectedStaffId.value,
          provider_id: authStore.provider?.id || '',
          day_of_week: index,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        }
      })
    }

    originalSchedule.value = JSON.parse(JSON.stringify(weeklySchedule.value))
    blockedDates.value = blockedData || []
  } catch (e) {
    console.error('Error fetching schedule:', e)
    showError(t('provider.availability.save_error'))
  } finally {
    loading.value = false
  }
}

const conflictList = ref<{day: string, count: number, samples: string[]}[]>([])

async function checkForConflicts(): Promise<boolean> {
  const futureAppointments = await appointmentStore.fetchFutureAppointments(selectedStaffId.value)
  if (!futureAppointments.length) return false

  const bookingsByDay = new Map<string, any[]>()
  
  for (const appt of futureAppointments) {
    const dateStr = appt.appointment_date
    if (!dateStr) continue 
    
    const date = parseISO(dateStr)
    const dayIndex = date.getDay()
    const dayName = daysOfWeek.value[dayIndex]
    
    if (!dayName) continue
    
    if (!bookingsByDay.has(dayName)) {
      bookingsByDay.set(dayName, [])
    }
    bookingsByDay.get(dayName)?.push(appt)
  }

  const conflicts: {day: string, count: number, samples: string[]}[] = []

  for (const slot of weeklySchedule.value) {
    const dayName = daysOfWeek.value[slot.day_of_week]
    if (!dayName) continue
    const originalSlot = originalSchedule.value.find(s => s.day_of_week === slot.day_of_week)
    
    if (!slot.is_available && originalSlot && originalSlot.is_available) {
       const bookings = bookingsByDay.get(dayName)
       if (bookings && bookings.length > 0) {
         conflicts.push({
           day: dayName,
           count: bookings.length,
           samples: bookings.slice(0, 3).map(a => {
             const d = a.appointment_date ? format(parseISO(a.appointment_date), 'MMM d') : 'Unknown Date'
             const t = a.start_time ? a.start_time.slice(0, 5) : '??:??'
             return `${d} @ ${t}`
           })
         })
       }
    }
  }

  if (conflicts.length > 0) {
    conflictList.value = conflicts
    confirmTitle.value = t('provider.availability.conflict_title')
    confirmMessage.value = t('provider.availability.conflict_msg')
    
    pendingSave.value = true
    showConfirmModal.value = true
    return true
  }
  
  return false
}

async function handleConfirmSave() {
  showConfirmModal.value = false
  if (pendingSave.value) {
    await performSave()
    pendingSave.value = false
  } else if (pendingDeleteId.value) {
    await performDeleteBlockedDate()
  }
}

async function handleCloseModal() {
  showConfirmModal.value = false
  if (pendingSave.value) {
    pendingSave.value = false
    await fetchSchedule()
  } else {
    pendingDeleteId.value = null
  }
}

async function performDeleteBlockedDate() {
  if (!pendingDeleteId.value) return
  const idToDelete = pendingDeleteId.value
  
  clearMessages()
  try {
    await availabilityService.deleteBlockedDate(idToDelete)
    showSuccess(t('provider.availability.delete_time_off_success'))
    await fetchSchedule()
  } catch (e) {
    console.error('Error deleting blocked date:', e)
    showError(t('provider.availability.delete_time_off_error'))
  } finally {
    showConfirmModal.value = false
    pendingDeleteId.value = null
  }
}

async function saveSchedule() {
  loading.value = true
  clearMessages()

  try {
    const hasConflicts = await checkForConflicts()
    if (hasConflicts) {
        loading.value = false
        return
    }
    
    await performSave()
  } catch (e) {
    console.error('Error in save flow:', e)
    showError('An error occurred')
    loading.value = false
  }
}

async function performSave() {
  loading.value = true
  try {
    const updates = weeklySchedule.value.map(slot => {
      const { id, ...data } = slot
      return String(id).startsWith('temp-') ? data : slot
    })

    await availabilityService.upsertAvailability(updates)

    showSuccess(t('provider.availability.save_success'))
    await fetchSchedule()
  } catch (e) {
    console.error('Error saving schedule:', e)
    showError(t('provider.availability.save_error'))
  } finally {
    loading.value = false
  }
}

// Blocked Dates Logic
const timeOffModal = useModal()
const blockForm = ref({
  start_date: '',
  end_date: '',
  reason: ''
})
const timeOffConflicts = ref<{date: string, time: string, customer?: string}[]>([])

async function addBlockedDate() {
  console.log('addBlockedDate called', { staffId: selectedStaffId.value, form: blockForm.value })
  if (!selectedStaffId.value) {
    console.log('No staff selected, returning early')
    return
  }
  clearMessages()
  timeOffConflicts.value = []
  
  const start = parseISO(blockForm.value.start_date)
  const end = parseISO(blockForm.value.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (end < start) {
    showError(t('provider.availability.error_end_date_before_start'))
    return
  }

  if (start < today) {
    showError(t('provider.availability.error_past_dates'))
    return
  }
  
  try {
    console.log('Checking for conflicts...')
    // Fetch actual appointments in the date range
    const appointments = await appointmentStore.fetchStaffAppointments(
      selectedStaffId.value,
      blockForm.value.start_date,
      blockForm.value.end_date
    )
    console.log('Appointments found:', appointments.length)

    if (appointments.length > 0) {
      // Build detailed conflict list
      timeOffConflicts.value = appointments.slice(0, 5).map(appt => ({
        date: appt.appointment_date ? format(parseISO(appt.appointment_date), 'MMM d, yyyy') : 'Unknown',
        time: appt.start_time ? appt.start_time.slice(0, 5) : '??:??',
        customer: appt.customer?.name
      }))
      showError(t('provider.availability.add_time_off_error'))
      return
    }

    console.log('Creating blocked date...')
    await availabilityService.createBlockedDate({
        staff_id: selectedStaffId.value,
        provider_id: authStore.provider?.id || '',
        start_date: blockForm.value.start_date,
        end_date: blockForm.value.end_date,
        reason: blockForm.value.reason
      })
    console.log('Blocked date created successfully')
    timeOffModal.close()
    blockForm.value = { start_date: '', end_date: '', reason: '' }
    showSuccess(t('provider.availability.add_time_off_success'))
    await fetchSchedule()
  } catch (e) {
    console.error('Error adding blocked date:', e)
    showError(t('provider.availability.add_time_off_error'))
  }
}

async function handleDeleteBlockedDate(id: string) {
  openDeleteConfirm(id)
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
            <h1 class="text-2xl font-bold text-gray-900">{{ $t('provider.availability.title') }}</h1>
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
              <span v-if="loading">{{ $t('common.loading') }}</span>
              <span v-else>{{ $t('common.save') }}</span>
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
            <h2 class="text-lg font-bold text-gray-900">{{ $t('provider.availability.weekly_schedule') }}</h2>
            <p class="text-sm text-gray-500">{{ $t('provider.availability.set_hours') }}</p>
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
                {{ $t('provider.availability.closed') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Blocked Dates -->
        <div class="bg-white rounded-lg shadow h-fit">
          <div class="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 class="text-lg font-bold text-gray-900">{{ $t('provider.availability.time_off') }}</h2>
              <p class="text-sm text-gray-500">{{ $t('provider.availability.vacations') }}</p>
            </div>
            <button 
              @click="timeOffModal.open()"
              class="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              + {{ $t('provider.availability.add_time_off') }}
            </button>
          </div>

          <div class="p-4">
            <div v-if="blockedDates.length === 0" class="text-center py-8 text-gray-500 text-sm">
              {{ $t('provider.availability.no_time_off') }}
            </div>
            <div v-else class="space-y-3">
              <div v-for="block in blockedDates" :key="block.id" class="bg-gray-50 rounded-lg p-3 border border-gray-200 relative group">
                <button 
                  @click="handleDeleteBlockedDate(block.id)"
                  class="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
                <p class="font-medium text-gray-900">{{ block.reason || $t('provider.availability.time_off') }}</p>
                <p class="text-sm text-gray-600">
                  {{ parseISO(block.start_date).toLocaleDateString() }} - 
                  {{ parseISO(block.end_date).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Off Modal -->
    <Modal
      :isOpen="timeOffModal.isOpen.value"
      :title="$t('provider.availability.add_time_off')"
      @close="timeOffModal.close()"
    >
      <form @submit.prevent="addBlockedDate" class="mt-4 space-y-4">
        <!-- Error Message with Appointment Details -->
        <div v-if="errorMessage" class="rounded-md bg-red-50 p-3 mb-2">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
              <!-- Appointment Details List -->
              <ul v-if="timeOffConflicts.length > 0" class="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                <li v-for="(conflict, idx) in timeOffConflicts" :key="idx">
                  {{ conflict.date }} @ {{ conflict.time }}<span v-if="conflict.customer"> - {{ conflict.customer }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ $t('provider.availability.reason_label') }}</label>
          <input 
            v-model="blockForm.reason" 
            type="text" 
            required 
            placeholder="e.g. Vacation" 
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ $t('provider.availability.start_date') }}</label>
            <input 
              v-model="blockForm.start_date" 
              type="date" 
              required 
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ $t('provider.availability.end_date') }}</label>
            <input 
              v-model="blockForm.end_date" 
              type="date" 
              required 
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
          </div>
        </div>
        <div class="mt-5 flex gap-3 sm:justify-end">
          <button 
            type="button" 
            class="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm" 
            @click="timeOffModal.close()"
          >
            {{ $t('common.cancel') }}
          </button>
          <button 
            type="submit" 
            class="flex-1 sm:flex-none inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm"
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
      :confirmLabel="$t('common.confirm')"
      :isDestructive="true"
      @close="handleCloseModal"
      @confirm="handleConfirmSave"
    >
      <div v-if="pendingSave && conflictList.length > 0" class="mt-2 text-sm text-gray-500">
        <p class="mb-3">
          {{ $t('provider.availability.conflict_active') }}
        </p>
        <ul class="space-y-3">
          <li v-for="conflict in conflictList" :key="conflict.day">
            <div class="font-medium text-red-600">
              {{ conflict.day }} ({{ conflict.count }} bookings)
            </div>
            <ul class="pl-4 mt-1 space-y-1 text-gray-400 text-xs">
              <li v-for="sample in conflict.samples" :key="sample">
                - {{ sample }}
              </li>
              <li v-if="conflict.count > 3">...and more</li>
            </ul>
          </li>
        </ul>
        <p class="mt-4 font-medium text-gray-700">
          {{ $t('provider.availability.conflict_proceed') }}
        </p>
      </div>
    </ConfirmationModal>
  </div>
</template>
