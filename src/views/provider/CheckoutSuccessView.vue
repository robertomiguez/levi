<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
useI18n() // Initialize i18n for template $t usage

const loading = ref(true)
const sessionId = ref<string | null>(null)

onMounted(async () => {
    sessionId.value = route.query.session_id as string || null
    
    // Refresh provider data to check profile status
    await authStore.fetchProviderProfile()
    
    // Brief loading state, then show success
    setTimeout(() => {
        loading.value = false
    }, 500)
})

function continueNow() {
    router.push('/provider/profile')
}
</script>

<template>
    <div class="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div class="text-center max-w-md">
            <!-- Loading -->
            <div v-if="loading" class="space-y-4">
                <Loader2 class="h-12 w-12 animate-spin text-green-600 mx-auto" />
                <p class="text-gray-600">{{ $t('checkout.verifying') }}</p>
            </div>

            <!-- Success -->
            <div v-else class="space-y-6">
                <!-- Success Icon -->
                <div class="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce-in">
                    <Check class="h-10 w-10 text-green-600" />
                </div>

                <!-- Title -->
                <h1 class="text-3xl font-bold text-gray-900">
                    {{ $t('checkout.success_title') }}
                </h1>

                <!-- Description -->
                <p class="text-gray-600">
                    {{ $t('checkout.success_message') }}
                </p>

                <!-- Trial Info -->
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                    <p class="font-semibold">🎉 {{ $t('checkout.trial_started') }}</p>
                    <p class="mt-1">{{ $t('checkout.trial_description') }}</p>
                </div>

                <!-- Button -->
                <div class="pt-4">
                    <Button 
                        @click="continueNow"
                        class="w-full sm:w-auto min-w-[200px]"
                    >
                        {{ $t('common.complete_profile') || 'Complete Profile' }}
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes bounce-in {
    0% {
        transform: scale(0);
        opacity: 0;
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.animate-bounce-in {
    animation: bounce-in 0.5s ease-out forwards;
}
</style>
