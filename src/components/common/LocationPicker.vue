
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Webpack/Vite
// See: https://github.com/Leaflet/Leaflet/issues/4968
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

const props = defineProps<{
  latitude: number | null
  longitude: number | null
}>()

const emit = defineEmits<{
  (e: 'update:location', location: { latitude: number; longitude: number }): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

onMounted(() => {
  if (!mapContainer.value) return

  // Default to a generic location if no coords provided (e.g., center of US or a neutral view)
  const initialLat = props.latitude || 37.0902
  const initialLng = props.longitude || -95.7129
  const initialZoom = props.latitude && props.longitude ? 15 : 4

  map = L.map(mapContainer.value).setView([initialLat, initialLng], initialZoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  // Add marker if we have coordinates
  if (props.latitude && props.longitude) {
    addMarker(props.latitude, props.longitude)
  }

  // Handle map clicks
  map.on('click', (e: L.LeafletMouseEvent) => {
    updateLocation(e.latlng.lat, e.latlng.lng)
  })
  
  // Invalidate size after a small delay to ensure container is rendered correctly in modals
  setTimeout(() => {
    map?.invalidateSize()
  }, 100)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

function addMarker(lat: number, lng: number) {
  if (!map) return

  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map)
    
    marker.on('dragend', (e) => {
      const latLng = e.target.getLatLng()
      emit('update:location', { latitude: latLng.lat, longitude: latLng.lng })
    })
  }
}

function updateLocation(lat: number, lng: number) {
  addMarker(lat, lng)
  emit('update:location', { latitude: lat, longitude: lng })
}

// Watch props to update map
watch(() => [props.latitude, props.longitude], ([newLat, newLng]) => {
  if (newLat && newLng && map) {
    // Only fly to if significantly different to avoid jitter during drag
    // But since we emit on dragend, this shouldn't be an issue for drag
    // This is mainly for when geocoding updates the props
    const currentCenter = map.getCenter()
    const distance = map.distance(currentCenter, [newLat, newLng]) // Distance in meters
    
    // Update marker
    addMarker(newLat, newLng)

    // If distance is large (e.g. > 100m) or we weren't zoomed in, fly there
    if (distance > 100 || map.getZoom() < 10) {
      map.flyTo([newLat, newLng], 15)
    }
  }
})
</script>

<template>
  <div class="location-picker-container">
    <div ref="mapContainer" class="h-full w-full rounded-md z-0"></div>
  </div>
</template>

<style scoped>
.location-picker-container {
  height: 300px; /* Default height */
  width: 100%;
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
}

/* Ensure Leaflet controls don't overlap with other UI if z-index is issue */
:deep(.leaflet-pane) {
  z-index: 0 !important;
}
:deep(.leaflet-top), :deep(.leaflet-bottom) {
  z-index: 1 !important;
}
</style>
