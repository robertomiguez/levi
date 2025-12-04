<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { Staff } from '../../types'

const authStore = useAuthStore()
const router = useRouter()

const staff = ref<Staff[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingStaff = ref<Staff | null>(null)

const form = ref({
  name: '',
  email: '',
  role: 'staff' as 'admin' | 'staff',
  active: true
})

onMounted(async () => {
  if (!authStore.provider) {
    router.push('/booking')
    return
  }
  await fetchStaff()
})

async function fetchStaff() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('provider_id', authStore.provider?.id)
      .order('active', { ascending: false })
      .order('name')

    if (error) throw error
    staff.value = data || []
  } catch (e) {
    console.error('Error fetching staff:', e)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingStaff.value = null
  form.value = {
    name: '',
    email: '',
    role: 'staff',
    active: true
  }
  showModal.value = true
}

function openEditModal(staffMember: Staff) {
  editingStaff.value = staffMember
  form.value = {
    name: staffMember.name,
    email: staffMember.email,
    role: staffMember.role,
    active: staffMember.active
  }
  showModal.value = true
}

async function handleSave() {
  if (!authStore.provider) return

  try {
    if (editingStaff.value) {
      // Update existing staff
      const { data, error } = await supabase
        .from('staff')
        .update({
          name: form.value.name,
          email: form.value.email,
          role: form.value.role,
          active: form.value.active
        })
        .eq('id', editingStaff.value.id)
        .select()
        .single()

      if (error) throw error
      
      // Update local state
      if (data) {
        const index = staff.value.findIndex(s => s.id === editingStaff.value!.id)
        if (index !== -1) {
          staff.value[index] = data
        }
      }
    } else {
      // Create new staff
      const { data, error } = await supabase
        .from('staff')
        .insert([{
          name: form.value.name,
          email: form.value.email,
          role: form.value.role,
          active: form.value.active,
          provider_id: authStore.provider.id
        }])
        .select()
        .single()

      if (error) throw error
      
      // Add to local state
      if (data) {
        staff.value.push(data)
      }
    }

    showModal.value = false
  } catch (e) {
    console.error('Error saving staff:', e)
    alert('Failed to save staff member: ' + (e instanceof Error ? e.message : String(e)))
  }
}

async function toggleActive(staffMember: Staff) {
  try {
    const { data, error } = await supabase
      .from('staff')
      .update({ active: !staffMember.active })
      .eq('id', staffMember.id)
      .select()
      .single()

    if (error) throw error
    
    // Update local state
    if (data) {
      const index = staff.value.findIndex(s => s.id === staffMember.id)
      if (index !== -1) {
        staff.value[index] = data
      }
    }
  } catch (e) {
    console.error('Error updating staff status:', e)
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

    <!-- Staff Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showModal = false"></div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              {{ editingStaff ? 'Edit Staff Member' : 'Add Staff Member' }}
            </h3>
            
            <form @submit.prevent="handleSave" class="mt-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Name</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Role</label>
                <select
                  v-model="form.role"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div class="flex items-center">
                <input
                  v-model="form.active"
                  type="checkbox"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label class="ml-2 block text-sm text-gray-900">Active</label>
              </div>

              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="submit"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  @click="showModal = false"
                >
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
