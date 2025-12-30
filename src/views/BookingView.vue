<script setup lang="ts">
import { onMounted, ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useServiceStore } from '../stores/useServiceStore'
import { useStaffStore } from '../stores/useStaffStore'
import { useAppointmentStore } from '../stores/useAppointmentStore'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'
import { addDays, format, startOfDay } from 'date-fns'
import type { TimeSlot, Provider } from '../types'
import { useNotifications } from '../composables/useNotifications'

const route = useRoute()
const serviceStore = useServiceStore()
const staffStore = useStaffStore()
const appointmentStore = useAppointmentStore()
const authStore = useAuthStore()
const { errorMessage, showError, clearMessages } = useNotifications()

// Provider filtering
const selectedProviderId = ref<string | null>(null)
const providerInfo = ref<Provider | null>(null)

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
  // Check for provider ID in URL
  const providerId = route.query.provider as string
  if (providerId) {
    selectedProviderId.value = providerId
    await fetchProviderInfo(providerId)
  }
  
  await serviceStore.fetchAllServices(providerId)
  await staffStore.fetchStaff()

  // Ensure customer profile exists if authenticated
  if (authStore.isAuthenticated && !authStore.customer) {
    await authStore.createCustomerProfile()
  }
})

async function fetchProviderInfo(providerId: string) {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*, provider_addresses(*)')
      .eq('id', providerId)
      .single()
    
    if (error) throw error
    providerInfo.value = data
  } catch (error) {
    console.error('Error fetching provider:', error)
  }
}

// Filter services by selected provider
const filteredServices = computed(() => {
  if (!selectedProviderId.value) {
    return serviceStore.services
  }
  return serviceStore.services.filter(s => s.provider_id === selectedProviderId.value)
})

const selectedService = computed(() => 
  filteredServices.value.find(s => s.id === selectedServiceId.value)
)

const selectedStaff = computed(() => 
  staffStore.staff.find(s => s.id === selectedStaffId.value)
)

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
    const dayOfWeek = selectedDate.value.getDay()
    const schedule = staffStore.availability.find(a => a.day_of_week === dayOfWeek)

    if (!schedule || !schedule.is_available) {
      availableSlots.value = []
      loadingSlots.value = false
      return
    }

    const dateStr = format(selectedDate.value, 'yyyy-MM-dd')
    
    // Check local blocked dates
    const isBlocked = staffStore.blockedDates.some(block => {
      return dateStr >= block.start_date && dateStr <= block.end_date
    })

    if (isBlocked) {
      availableSlots.value = []
      loadingSlots.value = false
      return
    }

    // Filter local appointments
    const dayAppointments = rangeAppointments.value.filter(a => 
      a.appointment_date === dateStr
    )

    // Generate slots purely on client side
    availableSlots.value = appointmentStore.generateSlots(
      selectedService.value,
      [schedule],
      dayAppointments,
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
  const service = serviceStore.services.find(s => s.id === serviceId)
  
  if (service?.staff && service.staff.length === 1 && service.staff[0]) {
    // Single staff: Auto-select and skip to Date/Time (Step 3)
    selectedStaffId.value = service.staff[0].id
    currentStep.value = 3
  } else {
    // Multiple staff or no staff: Go to Staff Selection (Step 2)
    // The "No Staff" message will be shown in Step 2
    selectedStaffId.value = ''
    currentStep.value = 2
  }
}

function selectDateTime() {
  if (selectedTime.value) {
    currentStep.value = 4
  }
}

function selectStaff(staffId: string) {
  selectedStaffId.value = staffId
  currentStep.value = 3
}

function goBack() {
  if (currentStep.value === 3) {
    // If we are on Date/Time step
    const service = serviceStore.services.find(s => s.id === selectedServiceId.value)
    if (service?.staff && service.staff.length === 1) {
      // If single staff, we skipped Step 2, so go back to Step 1
      currentStep.value = 1
    } else {
      // Otherwise go back to Staff Selection (Step 2)
      currentStep.value = 2
    }
  } else if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function submitBooking() {
  if (!selectedService.value || !selectedStaffId.value || !selectedDate.value || !selectedTime.value) {
    return
  }

  clearMessages()

  if (!authStore.customer) {
    // Try to create profile if it doesn't exist
    await authStore.createCustomerProfile()
    
    if (!authStore.customer) {
      showError('Please log in to book an appointment')
      return
    }
  }

  try {
    // Calculate end time
    const timeParts = selectedTime.value.split(':')
    if (timeParts.length !== 2) {
      throw new Error('Invalid time format')
    }

    const hoursStr = timeParts[0]!
    const minutesStr = timeParts[1]!
    
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
  } catch (e: any) {
    console.error('Error creating appointment:', e)
    
    // Check for PostgreSQL exclusion violation (code 23P01)
    if (e.code === '23P01' || e.message?.includes('no_overlapping_appointments')) {
      showError('This time slot was just booked by another customer. Please choose another time.')
      // Refresh slots to reflect the new reality
      await loadAvailableSlots()
    } else {
      showError('Failed to book appointment. Please try again.')
    }
  }
}

function formatPrice(price?: number) {
  if (!price) return 'Free'
  return `$${price.toFixed(2)}`
}

function formatDateDisplay(date: Date) {
  return format(date, 'EEEE, MMMM d, yyyy')
}

function formatAddress(provider: Provider | null): string {
  if (!provider?.provider_addresses?.length) return 'No address provided'
  const addr = provider.provider_addresses[0]
  if (!addr) return 'No address provided'
  // Filter out undefined/null/empty strings
  return [
    addr.street_address,
    addr.city,
    addr.state,
    addr.postal_code
  ].filter(p => p).join(', ')
}

// Removed unused isToday function

// Watch for staff selection to fetch availability
const rangeAppointments = ref<any[]>([])
let realtimeChannel: any = null

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

watch(selectedStaffId, async (newId) => {
  // Cleanup previous channel
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  if (newId) {
    // Reset selected date/time
    selectedTime.value = ''
    availableSlots.value = []
    
    const today = new Date()
    const endDate = addDays(today, 60)
    
    // Fetch all necessary data
    await Promise.all([
      staffStore.fetchAvailability(newId),
      staffStore.fetchBlockedDates(newId),
    ])

    // Load appointments for the range
    const fetchAppointments = async () => {
        rangeAppointments.value = await appointmentStore.fetchStaffAppointments(
        newId, 
        format(today, 'yyyy-MM-dd'), 
        format(endDate, 'yyyy-MM-dd')
      )
    }
    await fetchAppointments()

    // Subscribe to Realtime Updates
    realtimeChannel = supabase
      .channel(`public:appointments:staff_id=eq.${newId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT and DELETE (and UPDATE)
          schema: 'public',
          table: 'appointments',
          filter: `staff_id=eq.${newId}`
        },
        async (payload) => {
          // Simple strategy: Re-fetch the range to ensure perfect valid state
          // Alternatively, we could manually push/splice the array for speed
          // But re-fetching is safer and still fast for this dataset size
          console.log('Realtime update received:', payload)
          await fetchAppointments()
          
          // Force re-evaluation of slots if we are on the same date
          if (selectedDate.value) {
            await loadAvailableSlots()
          }
        }
      )
      .subscribe()
    
    // Auto-select first available date
    if (!isDateAvailable(selectedDate.value)) {
      const nextAvailable = availableDates.value.find(d => isDateAvailable(d))
      if (nextAvailable) {
        selectedDate.value = nextAvailable
      }
    }
  }
})

// Calculate status map for all dates at once (computed cache)
// This strictly optimizes the calendar rendering
const dayStatusMap = computed(() => {
  if (!selectedService.value || !selectedStaffId.value) return {}
  
  const map: Record<string, 'Available' | 'Busy' | 'Unavailable'> = {}
  
  availableDates.value.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // 1. Check working days
    const dayOfWeek = date.getDay()
    const schedule = staffStore.availability.find(a => a.day_of_week === dayOfWeek)
    
    if (!schedule || !schedule.is_available) {
      map[dateStr] = 'Unavailable'
      return
    }

    // 2. Check blocked dates
    const isBlocked = staffStore.blockedDates.some(block => {
      return dateStr >= block.start_date && dateStr <= block.end_date
    })
    
    if (isBlocked) {
      map[dateStr] = 'Busy'
      return
    }

    // 3. Lazy Check Availability
    const dayAppointments = rangeAppointments.value.filter(a => 
      a.appointment_date === dateStr
    )

    try {
      const isAvailable = appointmentStore.checkAvailability(
        selectedService.value,
        [schedule],
        dayAppointments,
        date
      )
      map[dateStr] = isAvailable ? 'Available' : 'Busy'
    } catch {
       map[dateStr] = 'Available'
    }
  })
  
  return map
})

function isDateAvailable(date: Date): boolean {
  return getDateStatus(date) === 'Available'
}

function getDateStatus(date: Date): 'Available' | 'Busy' | 'Unavailable' {
  const dateStr = format(date, 'yyyy-MM-dd')
  return dayStatusMap.value[dateStr] || 'Unavailable'
}

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
      <!-- Provider Info Banner -->
      <div v-if="providerInfo" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 mt-8">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            {{ providerInfo.business_name.charAt(0) }}
          </div>
          <div>
            <p class="text-sm text-gray-500">Booking with</p>
            <h2 class="text-lg font-bold text-gray-900">{{ providerInfo.business_name }}</h2>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="text-center mb-8" :class="providerInfo ? '' : 'pt-8'">
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
          <div class="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <span class="text-sm text-gray-500 block">Service</span>
              <p class="font-semibold text-gray-900">{{ selectedService?.name }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-500 block">Staff</span>
              <p class="font-semibold text-gray-900">{{ selectedStaff?.name }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-500 block">Date & Time</span>
              <p class="font-semibold text-gray-900">{{ formatDateDisplay(selectedDate) }} at {{ selectedTime }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-500 block">Price</span>
              <p class="font-semibold text-gray-900">{{ formatPrice(selectedService?.price) }}</p>
            </div>
             <div class="col-span-2 border-t border-gray-200 pt-3">
               <span class="text-sm text-gray-500 block">Location</span>
               <p class="font-semibold text-gray-900">{{ providerInfo?.business_name }}</p>
               <p class="text-gray-500 text-xs truncate">{{ formatAddress(providerInfo) }}</p>
            </div>
             <div v-if="notes" class="col-span-2 border-t border-gray-200 pt-3">
               <span class="text-sm text-gray-500 block">Your Notes</span>
               <p class="italic text-gray-700">{{ notes }}</p>
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

          <div class="flex items-center justify-between max-w-2xl mx-auto">
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">1</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Service</span>
            </div>
            <div class="flex-1 h-1 mx-4 bg-gray-300">
              <div :class="['h-full bg-primary-600 transition-all']" :style="{ width: currentStep > 1 ? '100%' : '0%' }"></div>
            </div>
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">2</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Staff</span>
            </div>
            <div class="flex-1 h-1 mx-4 bg-gray-300">
              <div :class="['h-full bg-primary-600 transition-all']" :style="{ width: currentStep > 2 ? '100%' : '0%' }"></div>
            </div>
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">3</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Time</span>
            </div>
            <div class="flex-1 h-1 mx-4 bg-gray-300">
              <div :class="['h-full bg-primary-600 transition-all']" :style="{ width: currentStep > 3 ? '100%' : '0%' }"></div>
            </div>
            <div class="flex items-center">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600']">4</div>
              <span class="ml-2 text-sm font-medium text-gray-700">Details</span>
            </div>
          </div>
        </div>

        <div class="p-8">
          <!-- Step 1: Select Service -->
          <div v-if="currentStep === 1">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Choose a Service</h2>
            
            <div v-if="filteredServices.length === 0" class="text-center py-12">
              <p class="text-gray-500">No services available from this provider.</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                v-for="service in filteredServices"
                :key="service.id"
                @click="selectService(service.id)"
                class="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all"
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="text-lg font-semibold text-gray-900">{{ service.name }}</h3>
                  <span class="text-lg font-bold text-primary-600">{{ formatPrice(service.price) }}</span>
                </div>
                <p v-if="service.categories" class="text-sm text-gray-500 mb-2">{{ service.categories.name }}</p>
                <p class="text-sm text-gray-600">{{ service.duration }} minutes</p>
              </button>
            </div>
          </div>



          <!-- Step 2: Select Staff -->
          <div v-if="currentStep === 2">
            <button @click="goBack" class="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center">
              ← Back
            </button>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Select Staff</h2>
            <p class="text-gray-600 mb-6">Service: <span class="font-semibold">{{ selectedService?.name }}</span></p>

            <!-- No Staff Message -->
            <div v-if="!selectedService?.staff || selectedService.staff.length === 0" class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
              <svg class="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-yellow-800">Service Unavailable</h3>
                <p class="mt-1 text-sm text-yellow-700">
                  We apologize, but there are currently no staff members available for this service. Please check back later or choose a different service.
                </p>
              </div>
            </div>

            <!-- Staff List -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                v-for="staff in selectedService.staff"
                :key="staff.id"
                @click="selectStaff(staff.id)"
                class="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all flex items-center gap-4"
              >
                <div class="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {{ staff.name.charAt(0) }}
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ staff.name }}</h3>
                  <p class="text-sm text-gray-500">{{ staff.role === 'admin' ? 'Provider' : 'Staff Member' }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Step 3: Select Date & Time -->
          <div v-if="currentStep === 3">
            <button @click="goBack" class="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center">
              ← Back
            </button>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
            <p class="text-gray-600 mb-6">
              Service: <span class="font-semibold">{{ selectedService?.name }}</span>
              <span class="mx-2">•</span>
              Staff: <span class="font-semibold">{{ staffStore.staff.find(s => s.id === selectedStaffId)?.name }}</span>
            </p>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Date Picker -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Choose Date</h3>
                <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  <button
                    v-for="date in availableDates.slice(0, 30)"
                    :key="date.toISOString()"
                    @click="isDateAvailable(date) ? selectedDate = date : null"
                    :disabled="!isDateAvailable(date)"
                    :class="[
                      'p-3 rounded-lg border-2 text-left transition-all relative overflow-hidden',
                      format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : isDateAvailable(date)
                          ? 'border-gray-200 hover:border-primary-300 bg-white'
                          : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    ]"
                  >
                    <div class="flex justify-between items-center">
                      <div>
                        <div class="text-xs text-gray-500">{{ format(date, 'EEE') }}</div>
                        <div class="font-semibold">{{ format(date, 'MMM d') }}</div>
                      </div>
                      
                      <!-- Status Label -->
                      <div v-if="!isDateAvailable(date)" class="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                        {{ getDateStatus(date) === 'Busy' ? 'Busy' : 'Unavailable' }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Time Slots -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Available Times for {{ format(selectedDate, 'MMM d') }}</h3>
                
                <div v-if="loadingSlots" class="text-center py-12">
                  <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                </div>

                <div v-else-if="availableSlots.length > 0" class="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  <button
                    v-for="slot in availableSlots"
                    :key="slot.time"
                    @click="slot.available ? selectedTime = slot.time : null"
                    :disabled="!slot.available"
                    :class="[
                      'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all relative overflow-hidden',
                      selectedTime === slot.time
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : slot.available
                          ? 'border-gray-200 hover:border-primary-300'
                          : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-75'
                    ]"
                  >
                    {{ slot.time }}
                    <!-- Strike-through for taken slots -->
                    <span v-if="!slot.available" class="absolute inset-0 flex items-center justify-center">
                      <span class="w-full border-t border-gray-300 transform -rotate-12"></span>
                    </span>
                  </button>
                </div>

                <div v-else class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p v-if="!isDateAvailable(selectedDate)">
                    {{ getDateStatus(selectedDate) === 'Busy' ? 'Staff is fully booked on this date.' : 'Staff is unavailable on this day.' }}
                  </p>
                  <p v-else>No slots available for this service on this date.</p>
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

          <!-- Step 4: Confirm Booking -->
          <div v-if="currentStep === 4">
            <button @click="goBack" class="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center">
              ← Back
            </button>
            
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Confirm Your Booking</h2>

            <!-- Error Notification -->
            <div v-if="errorMessage" class="rounded-md bg-red-50 p-4 mb-6 text-left">
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

            <!-- Booking Summary -->
            <div class="bg-primary-50 rounded-lg p-4 mb-6">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600 block">Service</span>
                  <p class="font-semibold text-gray-900">{{ selectedService?.name }}</p>
                </div>
                <div>
                  <span class="text-gray-600 block">Staff</span>
                  <p class="font-semibold text-gray-900">{{ selectedStaff?.name }}</p>
                </div>
                <div>
                  <span class="text-gray-600 block">Date</span>
                  <p class="font-semibold text-gray-900">{{ formatDateDisplay(selectedDate) }}</p>
                </div>
                <div>
                  <span class="text-gray-600 block">Time</span>
                  <p class="font-semibold text-gray-900">{{ selectedTime }}</p>
                </div>
                <div>
                  <span class="text-gray-600 block">Duration</span>
                  <p class="font-semibold text-gray-900">{{ selectedService?.duration }} min</p>
                </div>
                <div>
                  <span class="text-gray-600 block">Price</span>
                  <p class="font-semibold text-gray-900">{{ formatPrice(selectedService?.price) }}</p>
                </div>
                <div class="col-span-2 border-t border-primary-100 pt-2 mt-1">
                   <span class="text-gray-600 block">Location</span>
                   <p class="font-semibold text-gray-900">{{ providerInfo?.business_name }}</p>
                   <p class="text-gray-500 text-xs truncate">{{ formatAddress(providerInfo) }}</p>
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
