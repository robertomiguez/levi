<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavigationBar from './components/NavigationBar.vue'
import { useSettingsStore } from './stores/useSettingsStore'

const route = useRoute()
const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.initializeSettings()
})

// Hide navigation on certain pages
const hideNavigation = computed(() => {
  const hiddenRoutes = ['/login', '/provider/profile']
  return hiddenRoutes.includes(route.path)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <NavigationBar v-if="!hideNavigation" />
    <RouterView />
  </div>
</template>
