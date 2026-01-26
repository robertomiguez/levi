<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCategoryStore } from '../../stores/useCategoryStore'
import { useStaffStore } from '../../stores/useStaffStore'
import { useAuthStore } from '../../stores/useAuthStore'
import Modal from '../../components/common/Modal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  service: any // Temporarily using any to debug potential type import issues
  loading?: boolean
}>()

console.log('ServiceFormModal mounted', props.service)

const emit = defineEmits(['close', 'save'])
const categoryStore = useCategoryStore()
const staffStore = useStaffStore()
const authStore = useAuthStore()

const form = ref({
  name: '',
  category_id: '',
  price: 0,
  duration: 30,
  description: '',
  buffer_before: 0,
  buffer_after: 0,
  staff_ids: [] as string[]
})

onMounted(async () => {
  const promises = []
  
  // Only fetch if we don't have categories yet
  if (categoryStore.categories.length === 0) {
    promises.push(categoryStore.fetchCategories())
  }
  
  if (authStore.provider && staffStore.staff.length === 0) {
    promises.push(staffStore.fetchStaff(authStore.provider.id))
  }
  
  await Promise.all(promises)
  
  if (props.service) {
    form.value = {
      name: props.service.name,
      category_id: props.service.category_id || '',
      price: props.service.price || 0,
      duration: props.service.duration,
      description: props.service.description || '',
      buffer_before: props.service.buffer_before || 0,
      buffer_after: props.service.buffer_after || 0,
      staff_ids: props.service.staff?.map((s: any) => s.id) || []
    }
  } else {
    // For new services, verify we have a valid initial state
    if (categoryStore.categories.length > 0) {
      // Default to first category
      form.value.category_id = categoryStore.categories[0]?.id || ''
    }
  }
})

function handleSubmit() {
  console.log('Submitting form:', form.value)
  emit('save', form.value)
}
</script>

<template>
  <Modal
    :is-open="true"
    :title="service ? $t('modals.service.title_edit') : $t('modals.service.title_new')"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
      <!-- Name -->
      <div class="space-y-2">
        <Label for="service-name">{{ $t('modals.service.name') }}</Label>
        <Input
          id="service-name"
          v-model="form.name"
          type="text"
          required
          :placeholder="$t('modals.service.name_placeholder')"
        />
      </div>

      <!-- Category -->
      <div class="space-y-2">
        <Label for="service-category">{{ $t('modals.service.category') }}</Label>
        <select
          id="service-category"
          v-model="form.category_id"
          required
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>{{ $t('modals.service.category_placeholder') }}</option>
          <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Price -->
        <div class="space-y-2">
          <Label for="service-price">{{ $t('modals.service.price') }}</Label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="service-price"
              v-model="form.price"
              type="number"
              min="0"
              step="0.01"
              required
              class="pl-7"
            />
          </div>
        </div>

        <!-- Duration -->
        <div class="space-y-2">
          <Label for="service-duration">{{ $t('modals.service.duration') }}</Label>
          <Input
            id="service-duration"
            v-model="form.duration"
            type="number"
            min="5"
            step="5"
            required
          />
        </div>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <Label for="service-description">{{ $t('modals.service.description') }}</Label>
        <textarea
          id="service-description"
          v-model="form.description"
          rows="3"
          class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :placeholder="$t('modals.service.description_placeholder')"
        ></textarea>
      </div>

      <!-- Staff Selection -->
      <div class="space-y-2">
        <Label>{{ $t('modals.service.assign_staff') }}</Label>
        <div class="border border-input rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
          <div v-if="staffStore.staff.length === 0" class="text-sm text-muted-foreground italic px-2">
            {{ $t('modals.service.no_staff') }}
          </div>
          <div v-for="member in staffStore.staff" :key="member.id" class="flex items-center">
            <input
              :id="'staff-' + member.id"
              type="checkbox"
              :value="member.id"
              v-model="form.staff_ids"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label :for="'staff-' + member.id" class="ml-2 block text-sm text-foreground select-none cursor-pointer flex-1">
              {{ member.name }}
            </label>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">{{ $t('modals.service.assign_staff_help') }}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Buffer Before -->
        <div class="space-y-2">
          <Label for="buffer-before">{{ $t('modals.service.buffer_before') }}</Label>
          <Input
            id="buffer-before"
            v-model="form.buffer_before"
            type="number"
            min="0"
            step="5"
          />
        </div>

        <!-- Buffer After -->
        <div class="space-y-2">
          <Label for="buffer-after">{{ $t('modals.service.buffer_after') }}</Label>
          <Input
            id="buffer-after"
            v-model="form.buffer_after"
            type="number"
            min="0"
            step="5"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-5 flex gap-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          class="flex-1 sm:flex-none"
          @click="$emit('close')"
        >
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="submit"
          :disabled="props.loading"
          class="flex-1 sm:flex-none bg-primary-600 hover:bg-primary-700"
        >
          <Loader2 v-if="props.loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ props.loading ? $t('modals.service.saving') : $t('modals.service.save_button') }}
        </Button>
      </div>
    </form>
  </Modal>
</template>
