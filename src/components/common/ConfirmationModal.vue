<script setup lang="ts">
import Modal from './Modal.vue'

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
      <button
        type="button"
        class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm"
        @click="emit('close')"
      >
        {{ cancelLabel || 'Cancel' }}
      </button>
      <button
        type="button"
        class="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm"
        :class="isDestructive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'"
        @click="emit('confirm')"
      >
        {{ confirmLabel || 'Confirm' }}
      </button>
    </div>
  </Modal>
</template>
