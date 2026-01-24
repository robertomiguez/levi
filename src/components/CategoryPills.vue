<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
import { Badge } from '@/components/ui/badge'

interface Category {
  id: string
  name: string
  icon?: string
}

defineProps<{
  categories: Category[]
  selectedCategory?: string | null
}>()

const emit = defineEmits<{
  select: [categoryId: string | null]
}>()

function selectCategory(categoryId: string | null) {
  emit('select', categoryId)
}
</script>

<template>
  <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    <Badge
      @click="selectCategory(null)"
      class="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all hover:scale-105"
      :variant="!selectedCategory ? 'default' : 'outline'"
      :class="!selectedCategory 
        ? 'bg-white text-primary-600 hover:bg-gray-100 border-white' 
        : 'bg-transparent text-white border-white/50 hover:bg-white/10 hover:text-white'"
    >
      {{ $t('category_pills.all') }}
    </Badge>
    <Badge
      v-for="category in categories"
      :key="category.id"
      @click="selectCategory(category.id)"
      class="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all hover:scale-105"
      :variant="selectedCategory === category.id ? 'default' : 'outline'"
      :class="selectedCategory === category.id
        ? 'bg-white text-primary-600 hover:bg-gray-100 border-white' 
        : 'bg-transparent text-white border-white/50 hover:bg-white/10 hover:text-white'"
    >
      {{ category.name }}
    </Badge>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
