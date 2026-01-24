<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/useAuthStore'
import ImageUpload from '../../components/ImageUpload.vue'
import { saveProvider } from '../../services/providerService'
import { useNotifications } from '../../composables/useNotifications'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea' // Assuming Textarea component exists or use native
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Building, Phone, FileText } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const form = ref({
  business_name: '',
  description: '',
  phone: '',
  logo_url: null as string | null
})

const logoFile = ref<File | null>(null)
const loading = ref(false)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { showSuccess, showError, errorMessage, clearMessages } = useNotifications()

const isEditing = computed(() => !!authStore.provider)

// Stepper State
const currentStep = ref(1)
const totalSteps = 3

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    router.push('/provider/dashboard')
  }
}

// Populate form when data is available
function populateForm() {
  if (authStore.provider) {
    form.value = {
      business_name: authStore.provider.business_name || '',
      phone: authStore.provider.phone || '',
      description: authStore.provider.description || '',
      logo_url: authStore.provider.logo_url || null
    }
  }
}

onMounted(() => {
  populateForm()
})

// Watch for store changes (in case of page reload)
watch(
  () => authStore.provider,
  (newProvider) => {
    if (newProvider) {
      populateForm()
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (!authStore.user) return

  loading.value = true
  clearMessages()

  try {
    await saveProvider({
      user: authStore.user,
      provider: authStore.provider,
      form: form.value,
      logoFile: logoFile.value
    })

    showSuccess(isEditing.value
      ? t('provider_profile.save_success_edit')
      : t('provider_profile.save_success_new'))

    await authStore.fetchProviderProfile()

    router.push('/provider/dashboard')
  } catch (e) {
    showError(e instanceof Error ? e.message : t('provider_profile.save_error'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-2xl">
      <!-- Steps Indicator -->
      <div class="mb-8">
        <div class="flex items-center justify-between text-sm font-medium text-gray-500 mb-2">
          <span>Step {{ currentStep }} of {{ totalSteps }}</span>
          <span>{{ Math.round((currentStep / totalSteps) * 100) }}% Completed</span>
        </div>
        <div class="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-primary-600 transition-all duration-500 ease-in-out"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          ></div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{{ isEditing ? $t('provider_profile.title_edit') : $t('provider_profile.title_new') }}</CardTitle>
          <CardDescription>
            {{ isEditing ? $t('provider_profile.subtitle_edit') : $t('provider_profile.subtitle_new') }}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form @submit.prevent="handleSubmit" id="profile-form">
            <!-- Step 1: Basic Info -->
            <div v-show="currentStep === 1" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div class="flex items-center gap-2 mb-4 text-primary-600">
                <Building class="h-5 w-5" />
                <h3 class="font-semibold">{{ $t('provider_profile.business_name') }}</h3>
              </div>
              
              <div class="grid gap-4">
                <div class="grid gap-2">
                  <Label for="business_name">{{ $t('provider_profile.business_name') }}</Label>
                  <Input
                    id="business_name"
                    v-model="form.business_name"
                    required
                    placeholder="e.g. Elite Cuts"
                  />
                </div>

                <div class="grid gap-2">
                  <Label>{{ $t('provider_profile.logo_label') }}</Label>
                  <ImageUpload
                    v-model="form.logo_url"
                    :label="$t('provider_profile.logo_label')"
                    :help-text="$t('provider_profile.logo_help')"
                    :processing="loading"
                    @change="file => logoFile = file"
                  />
                </div>
              </div>
            </div>

            <!-- Step 2: Details & Contact -->
            <div v-show="currentStep === 2" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div class="flex items-center gap-2 mb-4 text-primary-600">
                <FileText class="h-5 w-5" />
                <h3 class="font-semibold">{{ $t('provider_profile.description') }} & Contact</h3>
              </div>

              <div class="grid gap-4">
                <div class="grid gap-2">
                  <Label for="description">{{ $t('provider_profile.description') }}</Label>
                  <Textarea
                    id="description"
                    v-model="form.description"
                    rows="4"
                    :placeholder="$t('provider_profile.description_placeholder')"
                  />
                </div>

                <div class="grid gap-2">
                  <Label for="phone">{{ $t('provider_profile.phone_number') }}</Label>
                  <div class="relative">
                    <Phone class="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      v-model="form.phone"
                      type="tel"
                      required
                      class="pl-9"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 3: Review & Submit -->
            <div v-show="currentStep === 3" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div class="text-center py-6">
                <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 class="h-8 w-8 text-green-600" />
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Ready to Launch!</h3>
                <p class="text-gray-600 mb-6">Review your details below before saving.</p>
                
                <div class="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto border border-gray-200">
                  <dl class="space-y-3">
                    <div class="flex justify-between">
                      <dt class="text-sm font-medium text-gray-500">Business</dt>
                      <dd class="text-sm font-semibold text-gray-900">{{ form.business_name }}</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-sm font-medium text-gray-500">Phone</dt>
                      <dd class="text-sm font-semibold text-gray-900">{{ form.phone }}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <!-- Error Alert -->
              <Alert v-if="errorMessage" variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ errorMessage }}</AlertDescription>
              </Alert>
            </div>
          </form>
        </CardContent>

        <CardFooter class="flex justify-between">
          <Button 
            variant="outline" 
            @click="prevStep" 
            :disabled="loading"
          >
            Back
          </Button>

          <Button 
            v-if="currentStep < totalSteps" 
            @click="nextStep"
            :disabled="currentStep === 1 && !form.business_name"
          >
            Continue
          </Button>

          <Button 
            v-else 
            @click="handleSubmit" 
            :disabled="loading"
            class="min-w-[120px]"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ loading ? 'Saving...' : (isEditing ? 'Update Profile' : 'Create Profile') }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
