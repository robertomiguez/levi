import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from './stores/useAuthStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth before mounting
const authStore = useAuthStore()
console.log('[Main] Initializing auth store...')
authStore.initialize()
    .then(() => {
        console.log('[Main] Auth initialized successfully, mounting app...')
        app.mount('#app')
        console.log('[Main] App mounted successfully')
    })
    .catch((error) => {
        console.error('[Main] Error during auth initialization:', error)
        // Mount app anyway to prevent blank screen
        app.mount('#app')
    })
