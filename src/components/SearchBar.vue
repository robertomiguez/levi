<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  search: [{ location: string; service: string; time: string }]
}>()

const { t } = useI18n()
const location = ref('')
const service = ref('')
const time = ref(t('search.time_anytime'))

function handleSearch() {
  emit('search', {
    location: location.value,
    service: service.value,
    time: time.value
  })
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-3 items-stretch">
    <!-- Location Input -->
    <div class="flex-1 flex items-center px-4 py-3 bg-white rounded-md shadow-sm">
      <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <input
        v-model="location"
        type="text"
        :placeholder="$t('search.location_placeholder')"
        class="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
      />
    </div>

    <!-- Service Input -->
    <div class="flex-1 flex items-center px-4 py-3 bg-white rounded-md shadow-sm">
      <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <input
        v-model="service"
        type="text"
        :placeholder="$t('search.service_placeholder')"
        class="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
      />
    </div>

    <!-- Time Select -->
    <div class="flex-1 flex items-center px-4 py-3 bg-white rounded-md shadow-sm">
      <svg class="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
      <select
        v-model="time"
        class="flex-1 outline-none text-gray-700 bg-transparent cursor-pointer appearance-none"
      >
        <option :value="$t('search.time_anytime')">{{ $t('search.time_anytime') }}</option>
        <option :value="$t('search.time_morning')">{{ $t('search.time_morning') }}</option>
        <option :value="$t('search.time_afternoon')">{{ $t('search.time_afternoon') }}</option>
        <option :value="$t('search.time_evening')">{{ $t('search.time_evening') }}</option>
      </select>
    </div>

    <!-- Search Button -->
    <button
      @click="handleSearch"
      class="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-md font-semibold transition-colors whitespace-nowrap"
    >
      {{ $t('search.button') }}
    </button>
  </div>
</template>
