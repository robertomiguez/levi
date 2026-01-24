<script setup lang="ts">
import Modal from './Modal.vue'
import { Button } from '@/components/ui/button'

defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Modal
    :isOpen="isOpen"
    :title="title"
    @close="emit('close')"
    maxWidth="sm:max-w-md"
  >
    <div class="mt-2">
      <slot>
        <p class="text-sm text-gray-500 whitespace-pre-wrap">
          {{ message }}
        </p>
      </slot>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button
        variant="outline"
        @click="emit('close')"
      >
        {{ cancelLabel || $t('common.cancel') }}
      </Button>
      <Button
        :variant="isDestructive ? 'destructive' : 'default'"
        :class="!isDestructive ? 'bg-primary-600 hover:bg-primary-700' : ''"
        @click="emit('confirm')"
      >
        {{ confirmLabel || $t('common.confirm') }}
      </Button>
    </div>
  </Modal>
</template>
