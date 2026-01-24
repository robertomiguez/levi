<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Provider, ProviderAddress } from '../types'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-vue-next'

const props = defineProps<{
  provider: Provider & {
    provider_addresses?: ProviderAddress[]
  }
  rating?: number
  reviewCount?: number
  categories?: string[]
}>()

const { t } = useI18n()
const initials = computed(() => {
  return props.provider.business_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const locationText = computed(() => {
  const addresses = props.provider.provider_addresses || []
  if (addresses.length === 0) return t('provider_card.location_tbd')

  // Get unique states
  const states = [...new Set(addresses.map(a => a.state).filter(Boolean))] as string[]

  if (states.length > 1) {
    // If multiple states, pick one address for each state to display
    const locations = states.map(state => {
      const addr = addresses.find(a => a.state === state && a.is_primary) || 
                   addresses.find(a => a.state === state)
      return addr ? `${addr.city}, ${addr.state}` : null
    }).filter(Boolean)
    
    return locations.join(' & ')
  }

  // Fallback to single location (primary or first)
  const primaryAddress = addresses.find(a => a.is_primary) || addresses[0]
  if (!primaryAddress) return t('provider_card.location_tbd')
  return `${primaryAddress.city}, ${primaryAddress.state || primaryAddress.postal_code}`
})

const ratingStars = computed(() => {
  const rating = props.rating || 0
  return Array.from({ length: 5 }, (_, i) => i < Math.floor(rating))
})
</script>

<template>
  <div class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden cursor-pointer group">
    <!-- Provider Avatar/Logo -->
    <div class="flex items-center gap-4 p-6 border-b border-gray-100">
      <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 overflow-hidden">
        <img v-if="provider.logo_url" :src="provider.logo_url" :alt="provider.business_name" class="w-full h-full object-cover" />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-lg text-gray-900 truncate group-hover:text-primary-600 transition-colors">{{ provider.business_name }}</h3>
        <p class="text-sm text-gray-500 truncate">{{ locationText }}</p>
      </div>
    </div>

    <!-- Rating & Reviews -->
    <div class="px-6 py-3 bg-gray-50">
      <div class="flex items-center gap-2">
        <div class="flex">
          <Star
            v-for="(filled, index) in ratingStars"
            :key="index"
            class="w-4 h-4"
            :class="filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'"
          />
        </div>
        <span class="text-sm font-medium text-gray-700">{{ rating || 5.0 }}</span>
        <span class="text-sm text-gray-500">({{ $t('provider_card.reviews', { count: reviewCount || 0 }) }})</span>
      </div>
    </div>

    <!-- Categories/Services -->
    <div v-if="categories && categories.length > 0" class="px-6 py-4">
      <div class="flex flex-wrap gap-2">
        <Badge
          v-for="(category, index) in categories.slice(0, 3)"
          :key="index"
          variant="secondary"
          class="bg-primary-100 text-primary-700 hover:bg-primary-200"
        >
          {{ category }}
        </Badge>
        <Badge
          v-if="categories.length > 3"
          variant="outline"
          class="bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
        >
          {{ $t('provider_card.more', { count: categories.length - 3 }) }}
        </Badge>
      </div>
    </div>
  </div>
</template>
