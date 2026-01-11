<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useStaffStore } from '../../stores/useStaffStore'
import { useAppointmentStore } from '../../stores/useAppointmentStore'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import * as staffService from '../../services/staffService'
import { format, parseISO } from 'date-fns'
import type { Staff, ProviderAddress } from '../../types'
import { useModal } from '../../composables/useModal'
import { useNotifications } from '../../composables/useNotifications'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import StaffFormModal from '../../components/provider/StaffFormModal.vue'

const authStore = useAuthStore()
const staffStore = useStaffStore()
const appointmentStore = useAppointmentStore()
const router = useRouter()
const { showSuccess, showError } = useNotifications()

const staff = ref<Staff[]>([])
const loading = ref(false)
const modal = useModal<Staff>()

// Provider Addresses (branches)
const providerAddresses = ref<ProviderAddress[]>([])
const selectedAddressIds = ref<string[]>([])

// Temporary storage for form data when handling conflicts
const pendingSavePayload = ref<{
  name: string
  email: string
  role: 'admin' | 'staff'
  active: boolean
  addressIds: string[]
} | null>(null)

// Conflict modal state
const showConflictModal = ref(false)
const conflicts = ref<any[]>([])
const pendingDeactivationStaff = ref<Staff | null>(null)
const isTogglingFromList = ref(false)

const groupedConflicts = computed(() => {
  const groups: Record<string, any[]> = {}
  conflicts.value.forEach(apt => {
    const date = apt.appointment_date
    if (!groups[date]) groups[date] = []
    groups[date].push(apt)
  })
  
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, appointments]) => ({
      date,
      dayName: format(parseISO(date), 'EEEE'),
      displayDate: format(parseISO(date), 'MMM d'),
      appointments
    }))
})

function formatTime(time: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours || '0'), parseInt(minutes || '0'))
  return format(date, 'HH:mm')
}

onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await Promise.all([
    fetchStaff(),
    fetchProviderAddresses()
  ])
})

async function fetchStaff() {
  loading.value = true
  try {
    if (authStore.provider?.id) {
       staff.value = await staffService.fetchStaff(authStore.provider.id)
    }
  } catch (e) {
    console.error('Error fetching staff:', e)
  } finally {
    loading.value = false
  }
}

async function fetchProviderAddresses() {
  if (!authStore.provider?.id) return
  try {
    const { data, error } = await supabase
      .from('provider_addresses')
      .select('*')
      .eq('provider_id', authStore.provider.id)
      .order('is_primary', { ascending: false })
    if (error) throw error
    providerAddresses.value = data || []
  } catch (e) {
    console.error('Error fetching provider addresses:', e)
  }
}

function openAddModal() {
  selectedAddressIds.value = [] // Component will handle default selection
  modal.open(null)
}

async function openEditModal(staffMember: Staff) {
  // Load existing address assignments first
  const addresses = await staffStore.fetchStaffAddresses(staffMember.id)
  selectedAddressIds.value = addresses.map(a => a.id)
  modal.open(staffMember)
}

async function onSaveStaff(payload: {
  name: string
  email: string
  role: 'admin' | 'staff'
  active: boolean
  addressIds: string[]
}) {
  if (!authStore.provider) return

  // Check for conflicts if deactivating an existing staff member
  if (modal.data.value && modal.data.value.active && !payload.active) {
    const foundConflicts = await appointmentStore.fetchFutureAppointments(modal.data.value.id, 'staff')
    if (foundConflicts.length > 0) {
      conflicts.value = foundConflicts
      pendingDeactivationStaff.value = modal.data.value
      pendingSavePayload.value = payload
      isTogglingFromList.value = false
      showConflictModal.value = true
      return
    }
  }

  await executeSave(payload)
}

async function executeSave(payload: typeof pendingSavePayload.value) {
  if (!authStore.provider || !payload) return
  
  try {
    let staffId: string | undefined
    
    if (modal.data.value) {
      // Update existing staff
      const data = await staffService.updateStaff(modal.data.value.id, {
        name: payload.name,
        email: payload.email,
        role: payload.role,
        active: payload.active
      })
      
      // Update local state
      if (data) {
        staffId = data.id
        const index = staff.value.findIndex(s => s.id === modal.data.value!.id)
        if (index !== -1) {
          staff.value[index] = data
        }
      }
    } else {
      // Create new staff
      const data = await staffService.createStaff({
        name: payload.name,
        email: payload.email,
        role: payload.role,
        active: payload.active,
        provider_id: authStore.provider.id
      })
      
      // Add to local state
      if (data) {
        staffId = data.id
        staff.value.push(data)
      }
    }

    // Sync address assignments
    if (staffId) {
      await staffStore.syncStaffAddresses(staffId, payload.addressIds)
      showSuccess(modal.data.value ? 'Staff member updated successfully' : 'Staff member added successfully')
    }

    modal.close()
    showConflictModal.value = false
    pendingSavePayload.value = null
  } catch (e) {
    console.error('Error saving staff:', e)
    showError('Failed to save staff member: ' + (e instanceof Error ? e.message : String(e)))
  }
}

async function toggleActive(staffMember: Staff) {
  // Check for conflicts only if deactivating
  if (staffMember.active) {
    const foundConflicts = await appointmentStore.fetchFutureAppointments(staffMember.id, 'staff')
    if (foundConflicts.length > 0) {
      conflicts.value = foundConflicts
      pendingDeactivationStaff.value = staffMember
      isTogglingFromList.value = true
      showConflictModal.value = true
      return
    }
  }

  await executeToggleActive(staffMember)
}

async function executeToggleActive(staffMember: Staff) {
  try {
    const data = await staffService.updateStaff(staffMember.id, { active: !staffMember.active })
    
    // Update local state
    if (data) {
      const index = staff.value.findIndex(s => s.id === staffMember.id)
      if (index !== -1) {
        staff.value[index] = data
      }
    }
    showConflictModal.value = false
  } catch (e) {
    console.error('Error updating staff status:', e)
    showError('Failed to update staff status')
  }
}

async function confirmDeactivation() {
  if (!pendingDeactivationStaff.value) return

  if (isTogglingFromList.value) {
    await executeToggleActive(pendingDeactivationStaff.value)
  } else {
    await executeSave(pendingSavePayload.value)
  }
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
            <h1 class="text-2xl font-bold text-gray-900">Staff Management</h1>
          </div>
          <button
            @click="openAddModal"
            class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Staff
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="text-gray-500 mt-4">Loading staff...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="staff.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900">No staff members</h3>
        <p class="text-gray-500 mt-2">Add your team members to manage their schedules.</p>
        <button
          @click="openAddModal"
          class="mt-4 text-primary-600 hover:text-primary-700 font-medium"
        >
          Add Staff →
        </button>
      </div>

      <!-- Staff Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="member in staff"
          :key="member.id"
          class="bg-white rounded-lg shadow hover:shadow-md transition-shadow border overflow-hidden"
          :class="member.active ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-75'"
        >
          <div class="p-6">
            <!-- Inactive banner -->
            <div v-if="!member.active" class="mb-3 -mx-6 -mt-6 px-6 py-2 bg-gray-200 border-b border-gray-300">
              <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                ⚠️ Inactive Staff
              </span>
            </div>

            <div class="flex items-center gap-4 mb-4">
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl"
                :class="member.active ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'"
              >
                {{ member.name.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold" :class="member.active ? 'text-gray-900' : 'text-gray-600'">
                  {{ member.name }}
                </h3>
                <p class="text-sm" :class="member.active ? 'text-gray-500' : 'text-gray-400'">
                  {{ member.email }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 mb-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'">
                {{ member.role === 'admin' ? 'Admin' : 'Staff' }}
              </span>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
              <!-- Toggle Switch -->
              <div class="flex items-center gap-3">
                <button
                  @click="toggleActive(member)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  :class="member.active ? 'bg-green-600' : 'bg-gray-300'"
                  :title="member.active ? 'Click to deactivate' : 'Click to activate'"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="member.active ? 'translate-x-6' : 'translate-x-1'"
                  ></span>
                </button>
                <span class="text-sm font-medium" :class="member.active ? 'text-green-600' : 'text-gray-500'">
                  {{ member.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              
              <button
                @click="openEditModal(member)"
                class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Edit staff member"
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

    <!-- Staff Form Modal -->
    <StaffFormModal
      :isOpen="modal.isOpen.value"
      :staff="modal.data.value"
      :providerAddresses="providerAddresses"
      :initialAddressIds="selectedAddressIds"
      @close="modal.close()"
      @save="onSaveStaff"
    />

    <!-- Conflict Confirmation -->
    <ConfirmationModal
      :isOpen="showConflictModal"
      title="Important: Schedule Conflict"
      :message="`You have active bookings with staff ${pendingDeactivationStaff?.name}`"
      confirmLabel="Confirm"
      :isDestructive="true"
      @close="showConflictModal = false"
      @confirm="confirmDeactivation"
    >
      <div v-if="conflicts.length > 0" class="mt-4">
        <div class="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="group in groupedConflicts" :key="group.date" class="space-y-2">
            <h4 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              {{ group.dayName }} 
              <span class="text-gray-400 font-normal">({{ group.appointments.length }} {{ group.appointments.length === 1 ? 'booking' : 'bookings' }})</span>
            </h4>
            <ul class="space-y-1 ml-2">
              <li v-for="apt in group.appointments" :key="apt.id" class="text-sm text-gray-600 flex items-center gap-2">
                <span class="text-gray-300">•</span>
                <span>{{ group.displayDate }} @ {{ formatTime(apt.start_time) }}</span>
              </li>
            </ul>
          </div>
        </div>
        <p class="mt-6 text-sm text-gray-500 italic">
          These appointments will remain scheduled. Do you wish to proceed?
        </p>
      </div>
    </ConfirmationModal>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style>
