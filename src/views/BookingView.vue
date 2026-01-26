<script setup lang="ts">
import { onMounted, ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useServiceStore } from '../stores/useServiceStore'
import { useStaffStore } from '../stores/useStaffStore'
import { useAppointmentStore } from '../stores/useAppointmentStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { supabase } from '../lib/supabase'
import { addDays, format, startOfDay } from 'date-fns'
import type { TimeSlot, Provider, ProviderAddress } from '../types'
import { useNotifications } from '../composables/useNotifications'
import { useI18n } from 'vue-i18n'
import LoginForm from '../components/auth/LoginForm.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea' // Using simple textarea style if component missing
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Loader2, 
  MapPin, 
  CheckCircle2, 
  User, 
  Clock, 
  ArrowLeft,
  Calendar as CalendarIcon,
  DollarSign
} from 'lucide-vue-next'

const route = useRoute()
const serviceStore = useServiceStore()
const staffStore = useStaffStore()
const appointmentStore = useAppointmentStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { t, locale } = useI18n()
const { errorMessage, showError, clearMessages } = useNotifications()

// Provider filtering
const selectedProviderId = ref<string | null>(null)
const providerInfo = ref<Provider | null>(null)

// Booking flow state
const currentStep = ref(1)
const selectedServiceId = ref<string>('')
const selectedStaffId = ref<string>('')
const selectedAddressId = ref<string>('')
const staffAddresses = ref<ProviderAddress[]>([])
const selectedDate = ref<Date>(new Date())
const selectedTime = ref<string>('')
const availableSlots = ref<TimeSlot[]>([])
const loadingSlots = ref(false)
const notes = ref('')

// Confirmation state
const bookingConfirmed = ref(false)
const showLogin = ref(false)
const confirmedAppointmentId = ref<string>('')
const confirmedDate = ref<Date | null>(null)
const confirmedTime = ref<string>('')

onMounted(async () => {
  const providerId = route.query.provider as string
  const staffId = route.query.staff as string

  if (staffId) {
    const staffMember = await staffStore.fetchStaffMember(staffId)
    if (staffMember && staffMember.provider_id) {
       selectedProviderId.value = staffMember.provider_id
       selectedStaffId.value = staffMember.id
       await fetchProviderInfo(staffMember.provider_id)
    }
  } else if (providerId) {
    selectedProviderId.value = providerId
    await fetchProviderInfo(providerId)
  }
  
  if (selectedProviderId.value) {
      await serviceStore.fetchAllServices(selectedProviderId.value)
  }
  await staffStore.fetchStaff()

  if (authStore.isAuthenticated && !authStore.customer) {
    await authStore.createCustomerProfile()
  }

  if (staffId && filteredServices.value.length === 1) {
      selectService(filteredServices.value[0]!.id)
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

const filteredServices = computed(() => {
  if (!selectedProviderId.value) {
    return serviceStore.services
  }
  
  let services = serviceStore.services.filter(s => s.provider_id === selectedProviderId.value)

  if (selectedStaffId.value) {
      services = services.filter(service => {
          if (!service.staff || service.staff.length === 0) return true
          return service.staff.some(s => s.id === selectedStaffId.value)
      })
  }

  return services
})

const selectedService = computed(() => 
  filteredServices.value.find(s => s.id === selectedServiceId.value)
)

const selectedStaff = computed(() => 
  staffStore.staff.find(s => s.id === selectedStaffId.value)
)



const availableDates = computed(() => {
  const dates = []
  const today = startOfDay(new Date())
  for (let i = 0; i < 60; i++) {
    dates.push(addDays(today, i))
  }
  return dates
})

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
    
    const isBlocked = staffStore.blockedDates.some(block => {
      return dateStr >= block.start_date && dateStr <= block.end_date
    })

    if (isBlocked) {
      availableSlots.value = []
      loadingSlots.value = false
      return
    }

    const dayAppointments = rangeAppointments.value.filter(a => 
      a.appointment_date === dateStr
    )

    availableSlots.value = appointmentStore.generateSlots(
      selectedService.value,
      [schedule],
      dayAppointments,
      selectedDate.value
    )
    
    selectedTime.value = ''
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
  
  if (selectedStaffId.value) {
      const isStaffValid = !service?.staff?.length || service.staff.some(s => s.id === selectedStaffId.value)
      
      if (isStaffValid) {
          selectStaff(selectedStaffId.value)
          return
      }
  }
  
  if (service?.staff && service.staff.length === 1 && service.staff[0]) {
    selectStaff(service.staff[0].id)
  } else {
    selectedStaffId.value = ''
    currentStep.value = 2
  }
}

function selectDateTime() {
  if (selectedTime.value) {
    currentStep.value = 4
  }
}

async function selectStaff(staffId: string) {
  selectedStaffId.value = staffId
  staffAddresses.value = await staffStore.fetchStaffAddresses(staffId)
  
  if (staffAddresses.value.length === 1 && staffAddresses.value[0]) {
    selectedAddressId.value = staffAddresses.value[0].id
    currentStep.value = 3 
  } else if (staffAddresses.value.length > 1) {
    currentStep.value = 2.5
  } else {
    currentStep.value = 3
  }
}

function selectBranch(addressId: string) {
  selectedAddressId.value = addressId
  currentStep.value = 3
}

function goBack() {
  if (currentStep.value === 3) {
    const service = serviceStore.services.find(s => s.id === selectedServiceId.value)
    if (service?.staff && service.staff.length === 1) {
      currentStep.value = 1
    } else {
      currentStep.value = 2
    }
  } else if (currentStep.value === 4) {
      if (showLogin.value) {
          showLogin.value = false
      } else {
          currentStep.value = 3
      }
  } else if (currentStep.value === 2.5) {
      currentStep.value = 2
  } else if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function submitBooking() {
  if (!selectedService.value || !selectedStaffId.value || !selectedDate.value || !selectedTime.value) {
    return
  }

  if (!providerInfo.value && selectedService.value?.provider_id) {
    await fetchProviderInfo(selectedService.value.provider_id)
  }

  clearMessages()

  if (!authStore.isAuthenticated) {
     showLogin.value = true
     return
  }

  if (!authStore.customer) {
    await authStore.createCustomerProfile()
    
    if (!authStore.customer) {
      showError('Please log in to book an appointment')
      return
    }
  }

  try {
    const timeParts = selectedTime.value.split(':')
    const hours = parseInt(timeParts[0]!)
    const minutes = parseInt(timeParts[1]!)
    
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + selectedService.value.duration
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

    const appointment = await appointmentStore.createAppointment({
      service_id: selectedServiceId.value,
      staff_id: selectedStaffId.value,
      address_id: selectedAddressId.value || undefined,
      customer_id: authStore.customer.id,
      appointment_date: format(selectedDate.value, 'yyyy-MM-dd'),
      start_time: selectedTime.value,
      end_time: endTime,
      status: 'confirmed',
      notes: notes.value || undefined
    })

    if (appointment) {
      confirmedAppointmentId.value = appointment.id
      confirmedDate.value = selectedDate.value
      confirmedTime.value = selectedTime.value
      bookingConfirmed.value = true

      if (providerInfo.value && authStore.customer?.email) {
          const payload = {
            booking: {
              ...appointment,
              service: selectedService.value
            },
            customer: {
              name: authStore.customer.name,
              email: authStore.customer.email
            },
            provider: providerInfo.value,
            staff: selectedStaff.value,
            locale: locale.value
          }
          
          try {
            await supabase.functions.invoke('send-booking-confirmation', {
              body: payload
            })
          } catch (emailError) {
            console.error('Error sending confirmation emails:', emailError)
          }
      }
    }
  } catch (e: any) {
    console.error('Error creating appointment:', e)
    if (e.code === '23P01' || e.message?.includes('no_overlapping_appointments')) {
      showError(t('booking.slot_taken_error'))
      await loadAvailableSlots()
    } else {
      showError(t('booking.booking_failed'))
    }
  }
}

function formatPrice(price?: number) {
  if (!price) return 'Free'
  return new Intl.NumberFormat(settingsStore.language, {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

function formatDateDisplay(date: Date) {
  return date.toLocaleDateString(settingsStore.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatAddress(provider: Provider | null): string {
  if (selectedAddressId.value && staffAddresses.value.length > 0) {
    const selectedAddr = staffAddresses.value.find(a => a.id === selectedAddressId.value)
    if (selectedAddr) {
      return [
        selectedAddr.label,
        selectedAddr.street_address,
        selectedAddr.city,
        selectedAddr.state,
        selectedAddr.postal_code
      ].filter(p => p).join(', ')
    }
  }

  if (!provider?.provider_addresses?.length) return 'No address provided'
  const addr = provider.provider_addresses[0]
  if (!addr) return 'No address provided'
  
  return [
    addr.label,
    addr.street_address,
    addr.city,
    addr.state,
    addr.postal_code
  ].filter(p => p).join(', ')
}

const rangeAppointments = ref<any[]>([])
let realtimeChannel: any = null

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

watch(selectedStaffId, async (newId) => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  if (newId) {
    selectedTime.value = ''
    availableSlots.value = []
    
    const today = new Date()
    const endDate = addDays(today, 60)
    
    await Promise.all([
      staffStore.fetchAvailability(newId),
      staffStore.fetchBlockedDates(newId),
    ])

    const fetchAppointments = async () => {
        rangeAppointments.value = await appointmentStore.fetchStaffAppointments(
        newId, 
        format(today, 'yyyy-MM-dd'), 
        format(endDate, 'yyyy-MM-dd')
      )
    }
    await fetchAppointments()

    realtimeChannel = supabase
      .channel(`public:appointments:staff_id=eq.${newId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `staff_id=eq.${newId}`
        },
        async () => {
          await fetchAppointments()
          if (selectedDate.value) {
            await loadAvailableSlots()
          }
        }
      )
      .subscribe()
    
    if (!isDateAvailable(selectedDate.value)) {
      const nextAvailable = availableDates.value.find(d => isDateAvailable(d))
      if (nextAvailable) {
        selectedDate.value = nextAvailable
      }
    }
  }
})

const dayStatusMap = computed(() => {
  if (!selectedService.value || !selectedStaffId.value) return {}
  
  const map: Record<string, 'Available' | 'Busy' | 'Unavailable'> = {}
  
  availableDates.value.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()
    const schedule = staffStore.availability.find(a => a.day_of_week === dayOfWeek)
    
    if (!schedule || !schedule.is_available) {
      map[dateStr] = 'Unavailable'
      return
    }

    const isBlocked = staffStore.blockedDates.some(block => {
      return dateStr >= block.start_date && dateStr <= block.end_date
    })
    
    if (isBlocked) {
      map[dateStr] = 'Unavailable'
      return
    }

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
  showLogin.value = false
}

async function handleLoginSuccess() {
    await submitBooking()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      
      <!-- Provider Header -->
      <header v-if="providerInfo" class="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-2">{{ providerInfo.business_name }}</h1>
        <p class="text-lg text-gray-600">{{ $t('booking.subtitle') }}</p>
      </header>

      <!-- Confirmation Success -->
      <div v-if="bookingConfirmed" class="max-w-xl mx-auto animate-in zoom-in duration-300">
        <Card class="border-green-100 shadow-xl shadow-green-50">
          <CardHeader class="text-center pb-2">
            <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 class="h-8 w-8 text-green-600" />
            </div>
            <CardTitle class="text-2xl text-green-700">{{ $t('booking.confirmed_title') }}</CardTitle>
            <CardDescription>{{ $t('booking.confirmed_desc', { email: authStore.customer?.email }) }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 pt-4">
            <div class="bg-gray-50 rounded-lg p-4 grid gap-3 text-sm border">
              <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ $t('booking.steps.service') }}</span>
                <span class="font-medium">{{ selectedService?.name }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ $t('booking.steps.staff') }}</span>
                <span class="font-medium">{{ selectedStaff?.name }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ $t('booking.date_label') }}</span>
                <span class="font-medium">{{ confirmedDate ? formatDateDisplay(confirmedDate) : '' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ $t('booking.time_label') }}</span>
                <span class="font-medium">{{ confirmedTime }}</span>
              </div>
              <div class="border-t pt-2 mt-2 flex justify-between items-center">
                <span class="text-gray-500">{{ $t('booking.location_label') }}</span>
                <span class="font-medium text-right max-w-[200px] truncate" :title="formatAddress(providerInfo)">{{ formatAddress(providerInfo) }}</span>
              </div>
            </div>
            <Button class="w-full mt-4" @click="resetBooking">{{ $t('booking.book_another') }}</Button>
          </CardContent>
        </Card>
      </div>

      <!-- Booking Flow -->
      <div v-else class="max-w-3xl mx-auto">
        <!-- Progress Steps -->
        <nav aria-label="Progress" class="mb-8">
          <ol role="list" class="grid grid-cols-4 w-full relative">
            <li v-for="step in 4" :key="step" class="relative flex justify-center text-center">
              <!-- Line Connector: Starts at center of this step, extends to center of next step -->
              <div 
                class="absolute top-1/2 left-1/2 w-full -translate-y-1/2 pointer-events-none" 
                v-if="step < 4"
              >
                <div class="h-0.5 w-full bg-gray-200"></div>
              </div>
              
              <!-- Step Circle -->
              <a href="#" class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white hover:bg-gray-50"
                :class="[
                  step < currentStep ? 'border-primary-600 bg-primary-600' : '',
                  step === currentStep ? 'border-primary-600' : 'border-gray-300'
                ]"
                @click.prevent="currentStep > step ? currentStep = step : null"
              >
                <CheckCircle2 v-if="step < currentStep" class="h-5 w-5 text-white" aria-hidden="true" />
                <span v-else class="h-2.5 w-2.5 rounded-full" :class="step === currentStep ? 'bg-primary-600' : 'bg-transparent'" aria-hidden="true" />
              </a>
            </li>
          </ol>
        </nav>

        <!-- Dynamic Step Content -->
        <Card class="shadow-lg border-t-4 border-t-primary-600">
          <div class="p-6 md:p-8">
            <!-- Step 1: Service Selection -->
            <div v-if="currentStep === 1" class="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <DollarSign class="h-6 w-6 text-primary-600" />
                {{ $t('booking.choose_service') }}
              </h2>
              
              <div v-if="filteredServices.length === 0" class="text-center py-12 text-gray-500">
                {{ $t('booking.no_services') }}
              </div>

              <div v-else class="grid grid-cols-1 gap-4">
                <div
                  v-for="service in filteredServices"
                  :key="service.id"
                  @click="selectService(service.id)"
                  class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 hover:border-primary-400 hover:bg-gray-50 cursor-pointer transition-all"
                >
                  <div class="min-w-0 flex-1">
                    <span class="absolute inset-0" aria-hidden="true" />
                    <div class="flex justify-between">
                      <p class="text-sm font-medium text-gray-900">{{ service.name }}</p>
                      <p class="text-sm font-bold text-primary-600">{{ formatPrice(service.price) }}</p>
                    </div>
                    <p class="truncate text-sm text-gray-500">{{ service.duration }} {{ $t('common.minutes') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Staff Selection -->
            <div v-if="currentStep === 2" class="animate-in fade-in slide-in-from-right-4 duration-300">
              <Button variant="ghost" class="mb-4 pl-0 hover:bg-transparent hover:text-primary-600" @click="goBack">
                <ArrowLeft class="mr-2 h-4 w-4" /> {{ $t('common.back') }}
              </Button>
              <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <User class="h-6 w-6 text-primary-600" />
                {{ $t('booking.select_staff') }}
              </h2>

              <div v-if="!selectedService?.staff || selectedService.staff.length === 0" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <!-- Warning Icon -->
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-yellow-700">
                      {{ $t('booking.staff_unavailable_desc') }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  v-for="staff in selectedService.staff"
                  :key="staff.id"
                  @click="selectStaff(staff.id)"
                  class="group relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 hover:border-primary-400 hover:bg-gray-50 cursor-pointer transition-all"
                >
                  <div class="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                    {{ staff.name.charAt(0) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <span class="absolute inset-0" aria-hidden="true" />
                    <p class="text-sm font-medium text-gray-900 group-hover:text-primary-600">{{ staff.name }}</p>
                    <p class="truncate text-xs text-gray-500">{{ staff.role === 'admin' ? 'Provider' : 'Staff Member' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2.5: Location Selection -->
            <div v-if="currentStep === 2.5" class="animate-in fade-in slide-in-from-right-4 duration-300">
              <Button variant="ghost" class="mb-4 pl-0 hover:bg-transparent hover:text-primary-600" @click="currentStep = 2">
                <ArrowLeft class="mr-2 h-4 w-4" /> {{ $t('common.back') }}
              </Button>
              <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <MapPin class="h-6 w-6 text-primary-600" />
                {{ $t('booking.select_location') }}
              </h2>

              <div class="grid grid-cols-1 gap-4">
                <div
                  v-for="address in staffAddresses"
                  :key="address.id"
                  @click="selectBranch(address.id)"
                  class="group relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-primary-400 hover:bg-gray-50 cursor-pointer transition-all"
                >
                  <div class="flex items-start gap-4">
                    <MapPin class="h-6 w-6 text-gray-400 group-hover:text-primary-600 mt-1" />
                    <div>
                      <h3 class="font-semibold text-gray-900 group-hover:text-primary-600">{{ address.label || 'Location' }}</h3>
                      <p class="text-gray-600 text-sm mt-1">{{ address.street_address }}</p>
                      <p class="text-gray-500 text-xs">{{ address.city }}, {{ address.state }} {{ address.postal_code }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 3: Date & Time -->
            <div v-if="currentStep === 3" class="animate-in fade-in slide-in-from-right-4 duration-300">
              <Button variant="ghost" class="mb-4 pl-0 hover:bg-transparent hover:text-primary-600" @click="goBack">
                <ArrowLeft class="mr-2 h-4 w-4" /> {{ $t('common.back') }}
              </Button>
              
              <div class="mb-6 pb-6 border-b border-gray-100">
                <h2 class="text-2xl font-bold mb-2 flex items-center gap-2">
                  <CalendarIcon class="h-6 w-6 text-primary-600" />
                  {{ $t('booking.select_datetime') }}
                </h2>
                <div class="flex flex-wrap gap-2 mt-2">
                  <span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {{ selectedService?.name }}
                  </span>
                  <span class="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    {{ staffStore.staff.find(s => s.id === selectedStaffId)?.name }}
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Date Picker -->
                <div>
                  <h3 class="font-medium text-gray-900 mb-3 ml-1">{{ $t('booking.choose_date') }}</h3>
                  <div class="space-y-2 h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    <button
                      v-for="date in availableDates"
                      :key="date.toISOString()"
                      @click="isDateAvailable(date) ? selectedDate = date : null"
                      :disabled="!isDateAvailable(date)"
                      class="w-full flex items-center justify-between p-3 rounded-md border text-sm transition-all"
                      :class="[
                        format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                          ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600 text-primary-900'
                          : isDateAvailable(date)
                            ? 'border-gray-200 hover:border-primary-300'
                            : 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed'
                      ]"
                    >
                      <div class="flex items-center gap-3">
                        <div class="flex flex-col items-center justify-center w-10 h-10 rounded bg-white border border-gray-100" :class="{'bg-primary-100 border-primary-200': format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')}">
                          <span class="text-xs uppercase font-bold text-gray-500">{{ date.toLocaleDateString(settingsStore.language, { weekday: 'short' }) }}</span>
                          <span class="font-bold text-gray-900">{{ date.getDate() }}</span>
                        </div>
                        <span class="font-medium">{{ date.toLocaleDateString(settingsStore.language, { month: 'long' }) }}</span>
                      </div>
                      
                      <div v-if="!isDateAvailable(date)" class="text-xs font-medium text-gray-400">
                        {{ getDateStatus(date) === 'Busy' ? $t('status.busy') : $t('booking.closed') }}
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Time Slots -->
                <div>
                  <h3 class="font-medium text-gray-900 mb-3 ml-1 flex items-center gap-2">
                    <Clock class="h-4 w-4" />
                    {{ $t('booking.available_times_header') }}
                  </h3>
                  
                  <div v-if="loadingSlots" class="flex justify-center py-12">
                    <Loader2 class="h-8 w-8 animate-spin text-primary-600" />
                  </div>

                  <div v-else-if="availableSlots.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                    <button
                      v-for="slot in availableSlots"
                      :key="slot.time"
                      @click="slot.available ? selectedTime = slot.time : null"
                      :disabled="!slot.available"
                      class="relative px-3 py-2 text-sm font-medium text-center rounded border transition-all"
                      :class="[
                        selectedTime === slot.time
                          ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                          : slot.available
                            ? 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
                            : 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed'
                      ]"
                    >
                      {{ slot.time }}
                      <div v-if="!slot.available" class="absolute inset-0 flex items-center justify-center">
                        <div class="h-px w-full bg-gray-300 rotate-12"></div>
                      </div>
                    </button>
                  </div>

                  <div v-else class="text-center py-12 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p class="text-gray-500 text-sm">
                      {{ !isDateAvailable(selectedDate) 
                          ? (getDateStatus(selectedDate) === 'Busy' ? $t('booking.fully_booked') : $t('booking.staff_unavailable_day')) 
                          : $t('booking.no_slots') 
                      }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <Button 
                  size="lg" 
                  @click="selectDateTime" 
                  :disabled="!selectedTime"
                  class="font-semibold px-8"
                >
                  Continue <span class="ml-2">→</span>
                </Button>
              </div>
            </div>

            <!-- Step 4: Confirmation -->
            <div v-if="currentStep === 4" class="animate-in fade-in slide-in-from-right-4 duration-300">
              <Button variant="ghost" class="mb-4 pl-0 hover:bg-transparent hover:text-primary-600" @click="goBack">
                <ArrowLeft class="mr-2 h-4 w-4" /> {{ $t('common.back') }}
              </Button>
              <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 class="h-6 w-6 text-primary-600" />
                {{ $t('booking.confirm_title') }}
              </h2>

              <Alert v-if="errorMessage" variant="destructive" class="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ errorMessage }}</AlertDescription>
              </Alert>

              <div class="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <h3 class="font-semibold text-gray-900 mb-4 border-b pb-2">{{ $t('booking.summary_title') }}</h3>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                  <div>
                    <dt class="text-gray-500">{{ $t('booking.steps.service') }}</dt>
                    <dd class="font-medium text-gray-900">{{ selectedService?.name }}</dd>
                  </div>
                  <div>
                    <dt class="text-gray-500">{{ $t('booking.steps.staff') }}</dt>
                    <dd class="font-medium text-gray-900">{{ selectedStaff?.name }}</dd>
                  </div>
                  <div>
                    <dt class="text-gray-500">{{ $t('booking.date_label') }}</dt>
                    <dd class="font-medium text-gray-900">{{ formatDateDisplay(selectedDate) }}</dd>
                  </div>
                  <div>
                    <dt class="text-gray-500">{{ $t('booking.time_label') }}</dt>
                    <dd class="font-medium text-gray-900">{{ selectedTime }}</dd>
                  </div>
                  <div class="sm:col-span-2 pt-2 mt-2 border-t border-gray-200">
                    <dt class="text-gray-500">{{ $t('booking.location_label') }}</dt>
                    <dd class="font-medium text-gray-900">{{ providerInfo?.business_name }}</dd>
                    <dd class="text-gray-500 text-xs mt-1">{{ formatAddress(providerInfo) }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Login Gate -->
              <div v-if="showLogin" class="mt-8 animate-in fade-in zoom-in duration-300 max-w-md mx-auto">
                 <Card class="border-2 border-primary-100 shadow-md">
                   <CardHeader>
                     <CardTitle class="text-xl">Authentication Required</CardTitle>
                     <CardDescription>Please log in to finalize your booking</CardDescription>
                   </CardHeader>
                   <CardContent>
                     <LoginForm :embedded="true" @success="handleLoginSuccess" />
                   </CardContent>
                 </Card>
              </div>

              <!-- Final Form -->
              <form v-else @submit.prevent="submitBooking" class="space-y-6">
                <div class="space-y-2">
                  <Label for="notes">{{ $t('booking.notes_label') }}</Label>
                  <Textarea
                    id="notes"
                    v-model="notes"
                    :placeholder="$t('booking.notes_placeholder')"
                  />
                </div>

                <Button type="submit" size="lg" class="w-full font-bold">
                  {{ $t('booking.confirm_button') }}
                </Button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
