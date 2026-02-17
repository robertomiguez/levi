<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

interface Props {
  text?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  fullscreen?: boolean
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'lg',
  color: 'text-primary-600',
  fullscreen: false,
  inline: false
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-4 w-4'
    case 'md': return 'h-8 w-8'
    case 'lg': return 'h-12 w-12'
    case 'xl': return 'h-16 w-16'
    default: return 'h-12 w-12'
  }
})
</script>

<template>
  <div 
    v-if="!inline"
    :class="[
      'flex flex-col items-center justify-center', 
      fullscreen ? 'fixed inset-0 z-50 bg-white/80 backdrop-blur-sm' : 'py-12'
    ]"
  >
    <Loader2 
      :class="[
        'animate-spin',
        sizeClasses,
        color
      ]"
    />
    <p v-if="text" class="mt-4 text-gray-500 font-medium animate-pulse">{{ text }}</p>
  </div>
  <Loader2 
    v-else
    :class="[
      'animate-spin',
      sizeClasses,
      color
    ]"
  />
</template>
