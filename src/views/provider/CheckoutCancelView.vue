<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { XCircle, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
useI18n() // Initialize i18n for template $t usage

function goToPricing() {
    router.push('/provider/pricing')
}
</script>

<template>
    <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div class="text-center max-w-md space-y-6">
            <!-- Cancel Icon -->
            <div class="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <XCircle class="h-10 w-10 text-gray-400" />
            </div>

            <!-- Title -->
            <h1 class="text-3xl font-bold text-gray-900">
                {{ $t('checkout.cancelled_title') }}
            </h1>

            <!-- Description -->
            <p class="text-gray-600">
                {{ $t('checkout.cancelled_message') }}
            </p>

            <!-- Info Box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <p>{{ $t('checkout.no_charge') }}</p>
            </div>

            <!-- Back Button -->
            <Button 
                @click="goToPricing" 
                variant="default"
                size="lg"
                class="gap-2"
            >
                <ArrowLeft class="h-4 w-4" />
                {{ $t('checkout.back_to_plans') }}
            </Button>
        </div>
    </div>
</template>
