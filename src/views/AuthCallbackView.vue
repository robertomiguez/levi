<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

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
    const customer = authStore.customer
    const isNewUser = !customer || !customer.name || !customer.phone

    // Check for pending booking state - only if redirect was explicitly set to /booking
    // This prevents stale booking state from hijacking normal logins
    if (redirect === '/booking') {
        const pendingBookingState = localStorage.getItem('pendingBookingState')
        if (pendingBookingState) {
            if (isNewUser) {
                // New user in booking flow: go to profile first, then return to booking
                router.push('/profile?redirect=/booking')
            } else {
                // Existing user in booking flow: go directly to booking to complete it
                router.push('/booking')
            }
            return
        }
    } else {
        // Clear any stale booking state if we're not in the booking flow
        localStorage.removeItem('pendingBookingState')
    }

    if (redirect === '/provider') {
        if (authStore.provider) {
            // Existing provider - go to dashboard
            router.push('/provider/dashboard')
        } else {
            // New provider - go to pricing first to select a plan
            router.push('/provider/pricing')
        }
    } else if (redirect && redirect !== '/booking') {
        // Other specific redirect (but not booking which we already handled above)
        router.push(redirect)
    } else if (authStore.provider) {
        // No redirect specified but user is a provider
        router.push('/provider/dashboard')
    } else {
        // Customer flow from header/normal login
        if (isNewUser) {
            // New customer - go to profile page first, then root
            router.push('/profile?redirect=/')
        } else {
            // Existing customer with complete profile - go to root
            router.push('/')
        }
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
            <LoadingSpinner size="md" color="text-primary" class="mx-auto mb-4" :inline="true" />
            <h2 class="text-lg font-semibold text-gray-900">Verifying login...</h2>
            <p class="text-sm text-muted-foreground mt-2">Please wait while we redirect you.</p>
        </div>
    </div>
</template>
