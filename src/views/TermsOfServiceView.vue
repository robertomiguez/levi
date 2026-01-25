<script setup lang="ts">
import LegalDocumentViewer from '@/components/legal/LegalDocumentViewer.vue'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

function goBack() {
  // Check if we have a 'from' context (e.g., /provider redirect)
  const from = route.query.from as string
  
  if (from) {
    // Return to login with the original redirect context preserved
    router.push({ path: '/login', query: { redirect: from } })
  } else if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="container max-w-4xl mx-auto py-8">
      <Button variant="ghost" @click="goBack" class="mb-6">
        <ArrowLeft class="mr-2 h-4 w-4" />
        {{ t('common.back') }}
      </Button>
      
      <div class="bg-card rounded-lg border shadow-sm">
        <LegalDocumentViewer documentType="terms" />
      </div>
    </div>
  </div>
</template>
