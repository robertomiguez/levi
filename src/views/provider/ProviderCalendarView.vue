<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { Staff } from '../../types'
import { format } from 'date-fns'
import AppointmentDetailsModal from '../../components/provider/AppointmentDetailsModal.vue'

const authStore = useAuthStore()
const router = useRouter()

const staff = ref<Staff[]>([])
const selectedStaffId = ref<string>('all')
const currentDate = ref(new Date())
const view = ref<'month' | 'week' | 'day'>('week')
const appointments = ref<any[]>([])
const loading = ref(false)

// Calendar generation helpers
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days = []
  
  // Padding for start of month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const date = new Date(year, month, -i)
    days.unshift({ date, isCurrentMonth: false })
  }
  
  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })
  }
  
  // Padding for end of month
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }
  
  return days
})

const weekDays = computed(() => {
  const curr = new Date(currentDate.value)
  const week = []
  
  // Start from Sunday
  curr.setDate(curr.getDate() - curr.getDay())
  
  for (let i = 0; i < 7; i++) {
    week.push(new Date(curr))
    curr.setDate(curr.getDate() + 1)
  }
  
  return week
})

onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await fetchStaff()
  await fetchAppointments()
})

async function fetchStaff() {
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('provider_id', authStore.provider?.id)
    .eq('active', true)
    .order('name')
  
  staff.value = data || []
}

async function fetchAppointments() {
  loading.value = true
  try {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        services!inner (name, duration),
        customers (name, phone, email),
        staff!inner (name, provider_id)
      `)
      .eq('services.provider_id', authStore.provider?.id)
      .eq('staff.provider_id', authStore.provider?.id)

    if (selectedStaffId.value !== 'all') {
      query = query.eq('staff_id', selectedStaffId.value)
    }

    // Date range filter based on view
    const start = new Date(currentDate.value)
    const end = new Date(currentDate.value)

    if (view.value === 'month') {
      start.setDate(1)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
    } else if (view.value === 'week') {
      start.setDate(start.getDate() - start.getDay())
      end.setDate(end.getDate() + (6 - end.getDay()))
    } else {
      // Day view
      // No change needed for start/end points, they are just reference points for the query
    }

    const { data, error } = await query
      .gte('appointment_date', format(start, 'yyyy-MM-dd'))
      .lte('appointment_date', format(end, 'yyyy-MM-dd'))

    if (error) throw error
    appointments.value = data || []
  } catch (e) {
    console.error('Error fetching appointments:', e)
  } finally {
    loading.value = false
  }
}

function getAppointmentsForDate(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return appointments.value.filter(apt => apt.appointment_date === dateStr)
}

function formatTime(time: string) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit' 
  })
}

function prevPeriod() {
  const date = new Date(currentDate.value)
  if (view.value === 'month') {
    date.setMonth(date.getMonth() - 1)
  } else if (view.value === 'week') {
    date.setDate(date.getDate() - 7)
  } else {
    date.setDate(date.getDate() - 1)
  }
  currentDate.value = date
  fetchAppointments()
}

function nextPeriod() {
  const date = new Date(currentDate.value)
  if (view.value === 'month') {
    date.setMonth(date.getMonth() + 1)
  } else if (view.value === 'week') {
    date.setDate(date.getDate() + 7)
  } else {
    date.setDate(date.getDate() + 1)
  }
  currentDate.value = date
  fetchAppointments()
}

function today() {
  currentDate.value = new Date()
  fetchAppointments()
}

// Appointment Details Modal
const selectedAppointment = ref<any>(null)
const showDetailsModal = ref(false)

function openAppointmentDetails(apt: any) {
  selectedAppointment.value = apt
  showDetailsModal.value = true
}

async function updateStatus(status: string) {
  if (!selectedAppointment.value) return
  
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', selectedAppointment.value.id)

    if (error) throw error
    
    selectedAppointment.value.status = status
    // Update in list
    const idx = appointments.value.findIndex(a => a.id === selectedAppointment.value.id)
    if (idx !== -1) appointments.value[idx].status = status
    
    showDetailsModal.value = false
  } catch (e) {
    console.error('Error updating status:', e)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button @click="router.push('/provider/dashboard')" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Calendar</h1>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- Staff Filter -->
            <select 
              v-model="selectedStaffId" 
              @change="fetchAppointments"
              class="border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">All Staff</option>
              <option v-for="member in staff" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>

            <!-- View Switcher -->
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button 
                v-for="v in ['month', 'week', 'day']" 
                :key="v"
                @click="view = v as any; fetchAppointments()"
                class="px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors"
                :class="view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              >
                {{ v }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar Controls -->
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button @click="prevPeriod" class="p-2 hover:bg-gray-200 rounded-full">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <h2 class="text-xl font-semibold text-gray-900">
          <span v-if="view === 'day'">
             {{ format(currentDate, 'MMMM d, yyyy') }}
          </span>
          <span v-else>
            {{ currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
          </span>
        </h2>
        <button @click="nextPeriod" class="p-2 hover:bg-gray-200 rounded-full">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        <button @click="today" class="text-sm font-medium text-primary-600 hover:text-primary-700">
          Today
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="max-w-7xl mx-auto px-6 pb-8">
      <div class="bg-white rounded-lg shadow overflow-hidden min-h-[600px]">
        <!-- Week View (Default) -->
        <div v-if="view === 'week'" class="flex flex-col h-full">
          <div class="grid grid-cols-7 border-b border-gray-200">
            <div 
              v-for="day in weekDays" 
              :key="day.toISOString()" 
              class="p-4 text-center border-r border-gray-100 last:border-r-0"
              :class="{'bg-blue-50': day.toDateString() === new Date().toDateString()}"
            >
              <p class="text-xs font-medium text-gray-500 uppercase">{{ day.toLocaleDateString('en-US', { weekday: 'short' }) }}</p>
              <p class="text-lg font-bold text-gray-900 mt-1">{{ day.getDate() }}</p>
            </div>
          </div>
          <div class="grid grid-cols-7 flex-1">
            <div 
              v-for="day in weekDays" 
              :key="day.toISOString()" 
              class="border-r border-gray-100 last:border-r-0 p-2 min-h-[500px]"
            >
              <div class="space-y-2">
                <button
                  v-for="apt in getAppointmentsForDate(day)"
                  :key="apt.id"
                  @click="openAppointmentDetails(apt)"
                  class="w-full text-left p-2 rounded text-xs border-l-4 shadow-sm hover:shadow-md transition-shadow"
                  :class="{
                    'bg-blue-50 border-blue-500': apt.status === 'confirmed',
                    'bg-yellow-50 border-yellow-500': apt.status === 'pending',
                    'bg-green-50 border-green-500': apt.status === 'completed',
                    'bg-red-50 border-red-500': apt.status === 'cancelled'
                  }"
                >
                  <p class="font-bold truncate">{{ formatTime(apt.start_time) }}</p>
                  <p class="truncate">{{ apt.customers?.name || apt.customers?.email || 'Unknown' }}</p>
                  <p class="text-gray-500 truncate">{{ apt.services?.name }}</p>
                  <p class="text-xs text-primary-600 truncate mt-1">w/ {{ apt.staff?.name }}</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Month View -->
        <div v-else-if="view === 'month'" class="grid grid-cols-7 border-b border-gray-200">
          <div v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="d" class="p-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
            {{ d }}
          </div>
          <div 
            v-for="(day, idx) in calendarDays" 
            :key="idx"
            class="min-h-[100px] p-2 border-b border-r border-gray-100 relative"
            :class="{'bg-gray-50': !day.isCurrentMonth}"
          >
            <span 
              class="text-sm font-medium"
              :class="{
                'text-gray-400': !day.isCurrentMonth,
                'text-primary-600 bg-primary-50 w-6 h-6 rounded-full flex items-center justify-center': day.date.toDateString() === new Date().toDateString()
              }"
            >
              {{ day.date.getDate() }}
            </span>
            <div class="mt-1 space-y-1">
              <div 
                v-for="apt in getAppointmentsForDate(day.date)" 
                :key="apt.id"
                class="w-2 h-2 rounded-full inline-block mr-1"
                :class="{
                  'bg-blue-500': apt.status === 'confirmed',
                  'bg-yellow-500': apt.status === 'pending',
                  'bg-green-500': apt.status === 'completed',
                  'bg-red-500': apt.status === 'cancelled'
                }"
                :title="`${apt.customers?.name} - ${apt.services?.name}`"
              ></div>
            </div>
          </div>
        </div>

        <!-- Day View -->
        <div v-else class="flex flex-col h-full p-4">
          <div class="space-y-4">
            <div 
              v-for="apt in getAppointmentsForDate(currentDate)" 
              :key="apt.id"
              @click="openAppointmentDetails(apt)"
              class="flex items-center p-4 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100"
              :class="{
                'border-l-blue-500': apt.status === 'confirmed',
                'border-l-yellow-500': apt.status === 'pending',
                'border-l-green-500': apt.status === 'completed',
                'border-l-red-500': apt.status === 'cancelled'
              }"
            >
              <div class="w-24 font-bold text-lg text-gray-900">
                {{ formatTime(apt.start_time) }}
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-gray-900">{{ apt.customers?.name || apt.customers?.email || 'Unknown' }}</h3>
                <p class="text-gray-600">{{ apt.services?.name }} with {{ apt.staff?.name }}</p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                  :class="{
                    'bg-blue-100 text-blue-800': apt.status === 'confirmed',
                    'bg-yellow-100 text-yellow-800': apt.status === 'pending',
                    'bg-green-100 text-green-800': apt.status === 'completed',
                    'bg-red-100 text-red-800': apt.status === 'cancelled'
                  }">
                  {{ apt.status }}
                </span>
              </div>
            </div>
            <div v-if="getAppointmentsForDate(currentDate).length === 0" class="text-center py-12 text-gray-500">
              No appointments for today.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Appointment Details Modal -->
    <AppointmentDetailsModal
      :isOpen="showDetailsModal"
      :appointment="selectedAppointment"
      @close="showDetailsModal = false"
      @update-status="updateStatus"
    />
  </div>
</template>
