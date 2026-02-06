<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { User, ArrowLeft } from 'lucide-vue-next'

interface Staff {
  id: string
  name: string
  role?: string
}

defineProps<{
  staff: Staff[]
  selectedStaffId: string
}>()

const emit = defineEmits<{
  select: [staffId: string]
  confirm: []
  back: []
}>()
</script>

<template>
  <div class="animate-in fade-in slide-in-from-right-4 duration-300">
    <Button variant="ghost" class="mb-4 pl-0 hover:bg-transparent hover:text-primary-600" @click="emit('back')">
      <ArrowLeft class="mr-2 h-4 w-4" /> {{ $t('common.back') }}
    </Button>
    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <User class="h-6 w-6 text-primary-600" />
      {{ $t('booking.select_staff') }}
    </h2>

    <div v-if="!staff || staff.length === 0" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            {{ $t('booking.staff_unavailable_desc') }}
          </p>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div
        v-for="member in staff"
        :key="member.id"
        @click="emit('select', member.id)"
        class="group relative flex items-center space-x-3 rounded-lg border px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 cursor-pointer transition-all"
        :class="selectedStaffId === member.id ? 'border-primary-600 ring-1 ring-primary-600 bg-primary-50' : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50'"
      >
        <div class="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold"
          :class="selectedStaffId === member.id ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'"
        >
          {{ member.name.charAt(0) }}
        </div>
        <div class="min-w-0 flex-1">
          <span class="absolute inset-0" aria-hidden="true" />
          <p class="text-sm font-medium text-gray-900 group-hover:text-primary-600">{{ member.name }}</p>
          <p class="truncate text-xs text-gray-500">{{ member.role === 'admin' ? 'Provider' : 'Staff Member' }}</p>
        </div>
      </div>
    </div>
    
    <div class="mt-8 pt-6 border-t border-gray-100 flex justify-end">
      <Button 
        size="lg" 
        @click="emit('confirm')" 
        :disabled="!selectedStaffId"
        class="font-semibold px-8"
      >
        Continue <span class="ml-2">→</span>
      </Button>
    </div>
  </div>
</template>
