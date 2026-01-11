<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import Modal from '../../components/common/Modal.vue'

defineProps<{
  isOpen: boolean
  appointment: any // Using any to match existing pattern, ideally should be typed
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update-status', status: 'confirmed' | 'completed' | 'cancelled'): void
}>()

function formatTime(time: string) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit' 
  })
}

function formatDate(dateStr: string) {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}
</script>

<template>
  <Modal
    :is-open="isOpen"
    title="Appointment Details"
    @close="$emit('close')"
  >
    <div v-if="appointment" class="mt-4 space-y-4">
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-sm text-gray-500">Customer</p>
        <p class="font-bold text-lg">{{ appointment.customers?.name || appointment.customers?.email || 'Unknown' }}</p>
        <p class="text-gray-600">{{ appointment.customers?.email }}</p>
        <p class="text-gray-600">{{ appointment.customers?.phone }}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500">Service</p>
          <p class="font-medium">{{ appointment.services?.name }}</p>
          <p class="text-sm text-gray-600">{{ appointment.services?.duration }} min</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Staff</p>
          <p class="font-medium">{{ appointment.staff?.name }}</p>
        </div>
      </div>

      <div>
        <p class="text-sm text-gray-500">Date & Time</p>
        <p class="font-medium">
          {{ formatDate(appointment.appointment_date) }} at {{ formatTime(appointment.start_time) }}
        </p>
      </div>

      <div>
        <p class="text-sm text-gray-500 mb-2">Status</p>
        <div class="flex gap-2">
          <button 
            @click="$emit('update-status', 'confirmed')"
            class="px-3 py-1 rounded-full text-sm font-medium border"
            :class="appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
          >
            Confirmed
          </button>
          <button 
            @click="$emit('update-status', 'completed')"
            class="px-3 py-1 rounded-full text-sm font-medium border"
            :class="appointment.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
          >
            Completed
          </button>
          <button 
            @click="$emit('update-status', 'cancelled')"
            class="px-3 py-1 rounded-full text-sm font-medium border"
            :class="appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
          >
            Cancelled
          </button>
        </div>
      </div>

      <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-1 sm:gap-3">
        <button
          type="button"
          class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </Modal>
</template>
