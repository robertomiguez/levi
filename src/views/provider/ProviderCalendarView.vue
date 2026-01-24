<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { Staff } from '../../types'
import { format } from 'date-fns'
import { useSettingsStore } from '../../stores/useSettingsStore'
import AppointmentDetailsModal from '../../components/provider/AppointmentDetailsModal.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const settingsStore = useSettingsStore()

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

function handleViewChange(newView: string) {
  view.value = newView as 'month' | 'week' | 'day'
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
  <div class="min-h-screen bg-gray-50/50 p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Header Controls -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 self-start md:self-auto">
          <Button variant="ghost" size="icon" @click="router.push('/provider/dashboard')">
            <ArrowLeft class="h-5 w-5" />
          </Button>
          <h1 class="text-2xl font-bold tracking-tight">{{ $t('calendar.title') }}</h1>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <!-- Staff Filter -->
          <div class="relative w-48">
            <select
              v-model="selectedStaffId" 
              @change="fetchAppointments"
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">{{ $t('category_pills.all') }} {{ $t('modals.appointment_details.staff') }}</option>
              <option v-for="member in staff" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </div>

          <!-- View Tabs -->
          <Tabs :model-value="view" @update:model-value="handleViewChange" class="w-[300px]">
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger value="month">{{ $t('calendar.month') }}</TabsTrigger>
              <TabsTrigger value="week">{{ $t('calendar.week') }}</TabsTrigger>
              <TabsTrigger value="day">{{ $t('calendar.day') }}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <!-- Calendar Card -->
      <Card class="overflow-hidden">
        <CardHeader class="border-b bg-gray-50/40 p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Button variant="outline" size="icon" @click="prevPeriod">
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" @click="nextPeriod">
                <ChevronRight class="h-4 w-4" />
              </Button>
              <h2 class="text-lg font-semibold ml-2">
                <span v-if="view === 'day'">
                   {{ currentDate.toLocaleDateString(settingsStore.language, { month: 'long', day: 'numeric', year: 'numeric' }) }}
                </span>
                <span v-else>
                  {{ currentDate.toLocaleDateString(settingsStore.language, { month: 'long', year: 'numeric' }) }}
                </span>
              </h2>
            </div>
            <Button variant="secondary" @click="today">
              {{ $t('calendar.today') }}
            </Button>
          </div>
        </CardHeader>

        <CardContent class="p-0">
          <div class="min-h-[600px]">
            <!-- Week View -->
            <div v-if="view === 'week'" class="flex flex-col h-full">
              <div class="grid grid-cols-7 border-b">
                <div 
                  v-for="day in weekDays" 
                  :key="day.toISOString()" 
                  class="p-4 text-center border-r last:border-r-0 bg-gray-50/40"
                  :class="{'bg-primary/5 text-primary': day.toDateString() === new Date().toDateString()}"
                >
                  <p class="text-xs font-medium uppercase text-muted-foreground">{{ day.toLocaleDateString(settingsStore.language, { weekday: 'short' }) }}</p>
                  <p class="text-lg font-bold mt-1">{{ day.getDate() }}</p>
                </div>
              </div>
              <div class="grid grid-cols-7 flex-1">
                <div 
                  v-for="day in weekDays" 
                  :key="day.toISOString()" 
                  class="border-r last:border-r-0 p-2 min-h-[500px]"
                >
                  <div class="space-y-2">
                    <button
                      v-for="apt in getAppointmentsForDate(day)"
                      :key="apt.id"
                      @click="openAppointmentDetails(apt)"
                      class="w-full text-left p-2.5 rounded-md text-xs border border-l-4 shadow-sm transition-all hover:bg-accent"
                      :class="{
                        'border-l-blue-500 bg-blue-50/50': apt.status === 'confirmed',
                        'border-l-yellow-500 bg-yellow-50/50': apt.status === 'pending',
                        'border-l-green-500 bg-green-50/50': apt.status === 'completed',
                        'border-l-red-500 bg-red-50/50': apt.status === 'cancelled'
                      }"
                    >
                      <p class="font-bold truncate">{{ formatTime(apt.start_time) }}</p>
                      <p class="font-medium truncate">{{ apt.customers?.name || apt.customers?.email || 'Unknown' }}</p>
                      <p class="text-muted-foreground truncate">{{ apt.services?.name }}</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Month View -->
            <div v-else-if="view === 'month'" class="grid grid-cols-7">
              <div v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="d" class="p-2 text-center text-xs font-medium text-muted-foreground uppercase border-b border-r last:border-r-0 bg-gray-50/40">
                {{ d }}
              </div>
              <div 
                v-for="(day, idx) in calendarDays" 
                :key="idx"
                class="min-h-[120px] p-2 border-b border-r last:border-r-0 relative transition-colors hover:bg-gray-50/30"
                :class="{'bg-gray-50/50': !day.isCurrentMonth}"
              >
                <span 
                  class="text-sm font-medium inline-flex w-7 h-7 items-center justify-center rounded-full"
                  :class="{
                    'text-muted-foreground': !day.isCurrentMonth,
                    'text-primary-foreground bg-primary': day.date.toDateString() === new Date().toDateString()
                  }"
                >
                  {{ day.date.getDate() }}
                </span>
                <div class="mt-2 space-y-1">
                  <div 
                    v-for="apt in getAppointmentsForDate(day.date)" 
                    :key="apt.id"
                    class="text-[10px] px-2 py-1 rounded truncate w-full border-l-2 cursor-pointer hover:opacity-80"
                    :class="{
                      'border-blue-500 bg-blue-100 text-blue-700': apt.status === 'confirmed',
                      'border-yellow-500 bg-yellow-100 text-yellow-700': apt.status === 'pending',
                      'border-green-500 bg-green-100 text-green-700': apt.status === 'completed',
                      'border-red-500 bg-red-100 text-red-700': apt.status === 'cancelled'
                    }"
                    @click="openAppointmentDetails(apt)"
                  >
                    {{ formatTime(apt.start_time) }} {{ apt.customers?.name }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Day View -->
            <div v-else class="flex flex-col h-full p-4">
              <div class="space-y-4 max-w-3xl mx-auto w-full">
                <div 
                  v-for="apt in getAppointmentsForDate(currentDate)" 
                  :key="apt.id"
                  @click="openAppointmentDetails(apt)"
                  class="flex items-center p-4 rounded-lg border border-l-4 bg-card shadow-sm transition-all hover:bg-accent cursor-pointer"
                  :class="{
                    'border-l-blue-500': apt.status === 'confirmed',
                    'border-l-yellow-500': apt.status === 'pending',
                    'border-l-green-500': apt.status === 'completed',
                    'border-l-red-500': apt.status === 'cancelled'
                  }"
                >
                  <div class="w-32 font-bold text-xl text-foreground">
                    {{ formatTime(apt.start_time) }}
                  </div>
                  <div class="flex-1">
                    <h3 class="font-bold text-lg">{{ apt.customers?.name || apt.customers?.email || 'Unknown' }}</h3>
                    <p class="text-muted-foreground">{{ apt.services?.name }} • {{ apt.staff?.name }}</p>
                  </div>
                  <div class="text-right">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      :class="{
                        'bg-blue-100 text-blue-800': apt.status === 'confirmed',
                        'bg-yellow-100 text-yellow-800': apt.status === 'pending',
                        'bg-green-100 text-green-800': apt.status === 'completed',
                        'bg-red-100 text-red-800': apt.status === 'cancelled'
                      }">
                      {{ $t(`status.${apt.status}`) }}
                    </span>
                  </div>
                </div>
                <div v-if="getAppointmentsForDate(currentDate).length === 0" class="text-center py-20 text-muted-foreground">
                  <p class="text-lg">{{ $t('calendar.no_appointments') }}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
