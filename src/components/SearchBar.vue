<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, ChevronDown, MapPin, Clock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  search: [{ location: string; service: string; time: string }]
}>()

const { t } = useI18n()
const location = ref('')
const service = ref('')
const time = ref(t('search.time_anytime'))

const timeOptions = [
  { value: t('search.time_anytime'), label: t('search.time_anytime') },
  { value: t('search.time_morning'), label: t('search.time_morning') },
  { value: t('search.time_afternoon'), label: t('search.time_afternoon') },
  { value: t('search.time_evening'), label: t('search.time_evening') }
]

function handleSearch() {
  emit('search', {
    location: location.value,
    service: service.value,
    time: time.value
  })
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-3 items-stretch p-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-2xl">
    <!-- Location Input -->
    <div class="flex-1 flex items-center px-4 py-3 bg-white rounded-lg shadow-sm border border-transparent focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
      <MapPin class="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
      <div class="flex-1">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{{ $t('search.location_label') }}</label>
        <input
          v-model="location"
          type="text"
          :placeholder="$t('search.location_placeholder')"
          class="w-full outline-none text-gray-900 placeholder-gray-400 bg-transparent text-sm font-medium"
        />
      </div>
    </div>

    <!-- Service Input -->
    <div class="flex-1 flex items-center px-4 py-3 bg-white rounded-lg shadow-sm border border-transparent focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
      <Search class="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
      <div class="flex-1">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{{ $t('search.service_label') }}</label>
        <input
          v-model="service"
          type="text"
          :placeholder="$t('search.service_placeholder')"
          class="w-full outline-none text-gray-900 placeholder-gray-400 bg-transparent text-sm font-medium"
        />
      </div>
    </div>

    <!-- Time Select -->
    <div class="flex-1 flex items-center px-4 py-3 bg-white rounded-lg shadow-sm border border-transparent focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
      <Clock class="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
      <div class="flex-1 relative">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{{ $t('search.time_label') }}</label>
        <select
          v-model="time"
          class="w-full outline-none text-gray-900 bg-transparent cursor-pointer appearance-none text-sm font-medium pr-4"
        >
          <option v-for="opt in timeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pointer-events-none">
          <ChevronDown class="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>

    <!-- Search Button -->
    <div class="flex items-center">
      <Button
        @click="handleSearch"
        size="lg"
        class="h-full w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white px-8 rounded-lg font-bold shadow-lg transition-all hover:scale-105"
      >
        <Search class="w-5 h-5 mr-2" />
        {{ $t('search.button') }}
      </Button>
    </div>
  </div>
</template>
