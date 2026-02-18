<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, MapPin } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useLocation } from '@/composables/useLocation'

const props = defineProps<{
  initialLocation?: string
}>()

const emit = defineEmits<{
  search: [{ location: string }]
}>()

const { t } = useI18n()
const { location: userLocation } = useLocation()

const location = ref(props.initialLocation || '')


import { watch } from 'vue'
watch(() => props.initialLocation, (newVal) => {
  if (newVal !== undefined) {
    location.value = newVal
  }
})



const locationPlaceholder = computed(() => userLocation.value || t('search.location_placeholder'))



function handleSearch() {
  emit('search', {
    location: location.value
  })
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-3 items-stretch p-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-2xl">
    <!-- Location Input -->
    <div class="flex-1 flex items-center px-4 py-2 bg-white rounded-lg shadow-sm border border-transparent focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
      <MapPin class="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
      <div class="flex-1">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{{ $t('search.location_label') }}</label>
        <input
          v-model="location"
          type="text"
          :placeholder="locationPlaceholder"
          class="w-full outline-none text-gray-900 placeholder-gray-400 bg-transparent text-sm font-medium"
        />
      </div>
    </div>





    <!-- Search Button -->
    <div class="flex items-center">
      <Button
        @click="handleSearch"
        size="lg"
        class="h-14 w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white px-8 rounded-lg font-bold shadow-lg transition-all hover:scale-105"
      >
        <Search class="w-5 h-5 mr-2" />
        {{ $t('search.button') }}
      </Button>
    </div>
  </div>
</template>
