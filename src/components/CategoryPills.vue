<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'

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
    <button
      @click="selectCategory(null)"
      class="px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all flex-shrink-0"
      :class="!selectedCategory 
        ? 'bg-white bg-opacity-30 border-white text-white font-semibold' 
        : 'bg-transparent border-white border-opacity-50 text-white hover:bg-white hover:bg-opacity-20'"
    >
      {{ $t('category_pills.all') }}
    </button>
    <button
      v-for="category in categories"
      :key="category.id"
      @click="selectCategory(category.id)"
      class="px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all flex-shrink-0"
      :class="selectedCategory === category.id 
        ? 'bg-white bg-opacity-30 border-white text-white font-semibold' 
        : 'bg-transparent border-white border-opacity-50 text-white hover:bg-white hover:bg-opacity-20'"
    >
      {{ category.name }}
    </button>
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
