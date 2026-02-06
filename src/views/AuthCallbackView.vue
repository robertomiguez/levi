<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { Loader2 } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
    // Wait for auth to initialize if it hasn't already
    // We strictly wait until we have a user AND loading is false (profiles fetched)
    const shouldWait = !authStore.isAuthenticated || authStore.loading

    if (shouldWait) {
        const unwatch = authStore.$subscribe((_, state) => {
            if (state.user && !state.loading) {
                unwatch()
                handleRedirect()
            }
        })
        
        // Also check immediately in case it's already done (e.g. race between mount and subscribe)
        if (authStore.user && !authStore.loading) {
            unwatch()
            handleRedirect()
        }
    } else {
        handleRedirect()
    }
})

function handleRedirect() {
    // Get redirect from query parameter (passed through OAuth flow)
    const redirect = route.query.redirect as string

    if (redirect === '/provider') {
        if (authStore.provider) {
            // Existing provider - go to dashboard
            router.push('/provider/dashboard')
        } else {
            // New provider - go to pricing first to select a plan
            router.push('/provider/pricing')
        }
    } else if (redirect) {
        // Other specific redirect
        router.push(redirect)
    } else if (authStore.provider) {
        // No redirect specified but user is a provider
        router.push('/provider/dashboard')
    } else {
        // Customer flow - check if profile is complete
        const customer = authStore.customer
        if (customer && customer.name && customer.phone) {
            // Existing customer with complete profile - go to root
            router.push('/')
        } else {
            // New customer or incomplete profile - go to profile page
            router.push('/profile')
        }
    }
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
