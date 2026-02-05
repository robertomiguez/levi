<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { Loader2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
    // Wait for auth to initialize if it hasn't already
    if (!authStore.isAuthenticated) {
        // The App.vue or main.ts likely calls initialize(), or we can rely on the watcher in the store
        // But to be safe, we can watch for the user to be set
        const unwatch = authStore.$subscribe((_, state) => {
            if (state.user) {
                unwatch()
                handleRedirect()
            }
        })
        
        // Also check immediately in case it's already done
        if (authStore.user) {
            unwatch()
            handleRedirect()
        }
    } else {
        handleRedirect()
    }
})

function handleRedirect() {
    // Short delay to ensure state is settled
    setTimeout(() => {
        router.push(authStore.userRole === 'provider' ? '/provider/dashboard' : '/my-bookings')
    }, 500)
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
            <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <h2 class="text-lg font-semibold text-gray-900">Verifying login...</h2>
            <p class="text-sm text-muted-foreground mt-2">Please wait while we redirect you.</p>
        </div>
    </div>
</template>
