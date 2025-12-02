<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useServiceStore } from '../stores/useServiceStore'
import { useStaffStore } from '../stores/useStaffStore'
import { useAppointmentStore } from '../stores/useAppointmentStore'
import { useAuthStore } from '../stores/useAuthStore'
import { addDays, format, startOfDay } from 'date-fns'
import type { TimeSlot } from '../types'

const serviceStore = useServiceStore()
const staffStore = useStaffStore()
const appointmentStore = useAppointmentStore()
const authStore = useAuthStore()

// Booking flow state
const currentStep = ref(1)
const selectedServiceId = ref<string>('')
const selectedStaffId = ref<string>('')
const selectedDate = ref<Date>(new Date())
const selectedTime = ref<string>('')
const availableSlots = ref<TimeSlot[]>([])
const loadingSlots = ref(false)
const notes = ref('')

// Confirmation state
const bookingConfirmed = ref(false)
const confirmedAppointmentId = ref<string>('')

onMounted(async () => {
  await serviceStore.fetchServices()
  await staffStore.fetchStaff()

  // Ensure customer profile exists if authenticated
  if (authStore.isAuthenticated && !authStore.customer) {
    await authStore.createCustomerProfile()
  }
})

const selectedService = computed(() => 
  serviceStore.services.find(s => s.id === selectedServiceId.value)
)

// Removed unused selectedStaff computed property

// Generate dates for the next 60 days
const availableDates = computed(() => {
  const dates = []
  const today = startOfDay(new Date())
  for (let i = 0; i < 60; i++) {
    dates.push(addDays(today, i))
  }
  return dates
})

// Watch for service/staff/date changes to load slots
watch([selectedServiceId, selectedStaffId, selectedDate], async ([serviceId, staffId, date]) => {
  if (serviceId && staffId && date) {
    await loadAvailableSlots()
  }
}, { deep: true })

async function loadAvailableSlots() {
  if (!selectedServiceId.value || !selectedStaffId.value || !selectedDate.value) return
  
  loadingSlots.value = true
  try {
    availableSlots.value = await appointmentStore.getAvailableSlots(
      selectedServiceId.value,
      selectedStaffId.value,
      selectedDate.value
    )
    selectedTime.value = '' // Reset selected time when slots change
  } catch (e) {
    console.error('Error loading slots:', e)
    availableSlots.value = []
  } finally {
    loadingSlots.value = false
  }
}

function selectService(serviceId: string) {
  selectedServiceId.value = serviceId
  if (staffStore.staff.length === 1 && staffStore.staff[0]) {
    selectedStaffId.value = staffStore.staff[0].id
  }
  currentStep.value = 2
}

function selectDateTime() {
  if (selectedTime.value) {
    currentStep.value = 3
  }
}

function goBack() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function submitBooking() {
  if (!selectedService.value || !selectedStaffId.value || !selectedDate.value || !selectedTime.value) {
    return
  }

  if (!authStore.customer) {
    // Try to create profile if it doesn't exist
    await authStore.createCustomerProfile()
    
    if (!authStore.customer) {
      alert('Please log in to book an appointment')
      return
    }
  }

  try {
    // Calculate end time
    const timeParts = selectedTime.value.split(':')
    if (timeParts.length !== 2) {
      throw new Error('Invalid time format')
    }

    const hoursStr = timeParts[0]
    const minutesStr = timeParts[1]
    
    const hours = parseInt(hoursStr)
    const minutes = parseInt(minutesStr)
    
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error('Invalid time format')
    }

    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + selectedService.value.duration
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

    const appointment = await appointmentStore.createAppointment({
      service_id: selectedServiceId.value,
      staff_id: selectedStaffId.value,
      customer_id: authStore.customer.id,
      appointment_date: format(selectedDate.value, 'yyyy-MM-dd'),
      start_time: selectedTime.value,
      end_time: endTime,
      status: 'confirmed',
      notes: notes.value || undefined
    })

    if (appointment) {
      confirmedAppointmentId.value = appointment.id
      bookingConfirmed.value = true
    }
  } catch (e) {
    console.error('Error creating appointment:', e)
    alert('Failed to book appointment. Please try again.')
  }
}

function formatPrice(price?: number) {
  if (!price) return 'Free'
  return `$${price.toFixed(2)}`
}

function formatDateDisplay(date: Date) {
  return format(date, 'EEEE, MMMM d, yyyy')
}

// Removed unused isToday function

function resetBooking() {
  bookingConfirmed.value = false
  currentStep.value = 1
  selectedServiceId.value = ''
  selectedStaffId.value = ''
  selectedDate.value = new Date()
  selectedTime.value = ''
  notes.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="text-center mb-8 pt-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
        <p class="text-gray-600">Choose a service and pick your preferred time</p>
      </div>

      <!-- Confirmation View -->
      <div v-if="bookingConfirmed" class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h2>
        <p class="text-gray-600 mb-6">We've sent a confirmation to {{ authStore.customer?.email }}</p>
        
        <div class="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <div class="space-y-3">
            <div>
              <span class="text-sm text-gray-500">Service:</span>
              <p class="font-semibold text-gray-900">{{ selectedService?.name }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-500">Date & Time:</span>
              <p class="font-semibold text-gray-900">{{ formatDateDisplay(selectedDate) }} at {{ selectedTime }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-500">Duration:</span>
              <p class="font-semibold text-gray-900">{{ selectedService?.duration }} minutes</p>
            </div>
          </div>
        </div>

        <button
          @click="resetBooking"
          class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Book Another Appointment
        </button>
      </div>

      <!-- Booking Flow -->
      <div v-else class="bg-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Progress Steps -->
        <div class="bg-gray-50 px-6 py-4 border-b">
          <div class="flex items-center justify-between max-w-md mx-auto">
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">1</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Service</span>
            </div>
            <div class="flex-1 h-1 mx-4 bg-gray-300">
              <div :class="['h-full bg-primary-600 transition-all']" :style="{ width: currentStep > 1 ? '100%' : '0%' }"></div>
            </div>
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">2</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Date & Time</span>
            </div>
            <div class="flex-1 h-1 mx-4 bg-gray-300">
              <div :class="['h-full bg-primary-600 transition-all']" :style="{ width: currentStep > 2 ? '100%' : '0%' }"></div>
            </div>
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">3</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Details</span>
            </div>
          </div>
        </div>

        <div class="p-8">
          <!-- Step 1: Select Service -->
          <div v-if="currentStep === 1">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Choose a Service</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                v-for="service in serviceStore.services"
                :key="service.id"
                @click="selectService(service.id)"
                class="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all"
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="text-lg font-semibold text-gray-900">{{ service.name }}</h3>
                  <span class="text-lg font-bold text-primary-600">{{ formatPrice(service.price) }}</span>
                </div>
                <p v-if="service.category" class="text-sm text-gray-500 mb-2">{{ service.category }}</p>
                <p class="text-sm text-gray-600">{{ service.duration }} minutes</p>
              </button>
            </div>
          </div>

          <!-- Step 2: Select Date & Time -->
          <div v-if="currentStep === 2">
            <button @click="goBack" class="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center">
              ← Back
            </button>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
            <p class="text-gray-600 mb-6">Service: <span class="font-semibold">{{ selectedService?.name }}</span></p>

            <!-- Staff Selection (if multiple staff) -->
            <div v-if="staffStore.staff.length > 1" class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Provider</label>
              <select 
                v-model="selectedStaffId"
                class="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Choose a provider...</option>
                <option v-for="staff in staffStore.staff" :key="staff.id" :value="staff.id">
                  {{ staff.name }}
                </option>
              </select>
            </div>

            <div v-if="selectedStaffId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Date Picker -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Choose Date</h3>
                <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  <button
                    v-for="date in availableDates.slice(0, 14)"
                    :key="date.toISOString()"
                    @click="selectedDate = date"
                    :class="[
                      'p-3 rounded-lg border-2 text-left transition-all',
                      format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    ]"
                  >
                    <div class="text-xs text-gray-500">{{ format(date, 'EEE') }}</div>
                    <div class="font-semibold">{{ format(date, 'MMM d') }}</div>
                  </button>
                </div>
              </div>

              <!-- Time Slots -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Available Times</h3>
                
                <div v-if="loadingSlots" class="text-center py-12">
                  <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                </div>

                <div v-else-if="availableSlots.length > 0" class="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  <button
                    v-for="slot in availableSlots"
                    :key="slot.time"
                    @click="selectedTime = slot.time"
                    :class="[
                      'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                      selectedTime === slot.time
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-200 hover:border-primary-300'
                    ]"
                  >
                    {{ slot.time }}
                  </button>
                </div>

                <div v-else class="text-center py-12 text-gray-500">
                  No available slots for this date
                </div>
              </div>
            </div>

            <button
              v-if="selectedTime"
              @click="selectDateTime"
              class="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>

          <!-- Step 3: Confirm Booking -->
          <div v-if="currentStep === 3">
            <button @click="goBack" class="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center">
              ← Back
            </button>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Confirm Your Booking</h2>

            <!-- Booking Summary -->
            <div class="bg-primary-50 rounded-lg p-4 mb-6">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Service:</span>
                  <p class="font-semibold">{{ selectedService?.name }}</p>
                </div>
                <div>
                  <span class="text-gray-600">Date:</span>
                  <p class="font-semibold">{{ formatDateDisplay(selectedDate) }}</p>
                </div>
                <div>
                  <span class="text-gray-600">Time:</span>
                  <p class="font-semibold">{{ selectedTime }}</p>
                </div>
                <div>
                  <span class="text-gray-600">Duration:</span>
                  <p class="font-semibold">{{ selectedService?.duration }} min</p>
                </div>
              </div>
            </div>

            <!-- Customer Info Display -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 class="font-semibold text-gray-900 mb-3">Your Information</h3>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-gray-600">Name:</span>
                  <span class="ml-2 font-medium">{{ authStore.customer?.name || authStore.user?.email }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Email:</span>
                  <span class="ml-2 font-medium">{{ authStore.customer?.email }}</span>
                </div>
                <div v-if="authStore.customer?.phone">
                  <span class="text-gray-600">Phone:</span>
                  <span class="ml-2 font-medium">{{ authStore.customer.phone }}</span>
                </div>
              </div>
            </div>

            <form @submit.prevent="submitBooking" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  v-model="notes"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Any special requests or notes..."
                ></textarea>
              </div>

              <button
                type="submit"
                class="w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
