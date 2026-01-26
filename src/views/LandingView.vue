<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import SearchBar from '../components/SearchBar.vue'
import CategoryPills from '../components/CategoryPills.vue'
import ProviderCard from '../components/ProviderCard.vue'
import { supabase } from '../lib/supabase'
import type { Provider, ProviderAddress, Category } from '../types'
import { Search } from 'lucide-vue-next'

const router = useRouter()

const providers = ref<(Provider & { provider_addresses?: ProviderAddress[]; categories?: string[] })[]>([])
const categories = ref<Category[]>([])
const selectedCategory = ref<string | null>(null)
const searchParams = ref({ location: '', service: '', time: 'Anytime' })
const loading = ref(false)

// Rotating hero content
const heroOptions = [
  {
    service: 'manicure',
    image: '/src/assets/images/hero_background_manicure_1765115664380.png'
  },
  {
    service: 'haircut',
    image: '/src/assets/images/hero_barber_service_1765116285430.png'
  },
  {
    service: 'massage',
    image: '/src/assets/images/hero_massage_service_1765116300777.png'
  },
  {
    service: 'spa',
    image: '/src/assets/images/hero_spa_service_1765116318055.png'
  }
]

const currentHeroIndex = ref(0)
let rotationInterval: number | null = null

const currentHero = computed(() => (heroOptions[currentHeroIndex.value] ?? heroOptions[0])!)

function rotateHero() {
  // Get random index different from current
  let newIndex = currentHeroIndex.value
  while (newIndex === currentHeroIndex.value) {
    newIndex = Math.floor(Math.random() * heroOptions.length)
  }
  currentHeroIndex.value = newIndex
}

onMounted(async () => {
  await Promise.all([
    fetchCategories(),
    fetchProviders()
  ])
  
  // Start rotation
  rotationInterval = window.setInterval(rotateHero, 3000)
})

onUnmounted(() => {
  if (rotationInterval) {
    clearInterval(rotationInterval)
  }
})

async function fetchCategories() {
  try {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    categories.value = data || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

async function fetchProviders() {
  loading.value = true
  try {
    // Fetch approved providers with their addresses
    const { data } = await supabase
      .from('providers')
      .select(`
        *,
        provider_addresses (*),
        services (
          categories (name)
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12)
    
    // Process providers to extract unique categories
    providers.value = (data || []).map(provider => ({
      ...provider,
      categories: Array.from(new Set(
        provider.services
          ?.map((s: any) => s.categories?.name)
          .filter(Boolean) || []
      ))
    }))
  } catch (error) {
    console.error('Error fetching providers:', error)
  } finally {
    loading.value = false
  }
}

const filteredProviders = computed(() => {
  let result = providers.value

  // Filter by selected category
  if (selectedCategory.value) {
    result = result.filter(p => 
      p.categories?.includes(
        categories.value.find(c => c.id === selectedCategory.value)?.name || ''
      )
    )
  }

  // Filter by search params
  if (searchParams.value.location) {
    result = result.filter(p => 
      p.business_name.toLowerCase().includes(searchParams.value.location.toLowerCase()) ||
      p.provider_addresses?.some(a => 
        a.city.toLowerCase().includes(searchParams.value.location.toLowerCase()) ||
        a.state?.toLowerCase().includes(searchParams.value.location.toLowerCase())
      )
    )
  }

  if (searchParams.value.service) {
    result = result.filter(p =>
      p.categories?.some(c => 
        c.toLowerCase().includes(searchParams.value.service.toLowerCase())
      )
    )
  }

  return result
})

const resultsSection = ref<HTMLElement | null>(null)

function scrollToResults() {
  if (resultsSection.value && window.innerWidth < 768) {
    resultsSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function handleSearch(params: { location: string; service: string; time: string }) {
  searchParams.value = params
  scrollToResults()
}

function handleCategorySelect(categoryId: string | null) {
  selectedCategory.value = categoryId
  scrollToResults()
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section with Background Image -->
    <div 
      class="relative bg-cover bg-center min-h-[600px] md:h-[500px] flex items-center transition-all duration-1000"
      :style="`background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${currentHero.image}')`"
    >
      <div class="max-w-7xl mx-auto px-6 w-full py-16 md:py-0">
        <div class="max-w-3xl">
          <h1 class="text-5xl lg:text-6xl font-bold text-white mb-6 min-h-[3.6em] lg:min-h-[2.4em] flex flex-col justify-center">
            {{ $t('landing.hero_title') }} 
            <span class="inline-block transition-all duration-500">{{ $t(`landing.hero_services.${currentHero.service}`) }}</span>
          </h1>
          
          <!-- Search Bar -->
          <SearchBar @search="handleSearch" />
          
          <!-- Category Pills -->
          <div class="mt-10">
            <CategoryPills 
              :categories="categories"
              :selected-category="selectedCategory"
              @select="handleCategorySelect"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Popular Providers Section -->
    <div ref="resultsSection" class="max-w-7xl mx-auto px-6 py-12 scroll-mt-24">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-2">
          {{ $t('landing.popular_in', { location: 'San Francisco, CA' }) }}
          <a href="#" class="text-base font-normal text-primary-600 hover:text-primary-700 ml-4">
            {{ $t('nav.see_all') }} →
          </a>
        </h2>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="text-gray-500 mt-4">{{ $t('common.loading') }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProviders.length === 0" class="text-center py-12">
        <Search class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">{{ $t('landing.no_providers_found') }}</h3>
        <p class="text-gray-600">{{ $t('landing.adjust_search') }}</p>
      </div>

      <!-- Provider Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <ProviderCard
          v-for="provider in filteredProviders"
          :key="provider.id"
          :provider="provider"
          :rating="5.0"
          :review-count="Math.floor(Math.random() * 100) + 10"
          :categories="provider.categories"
          @click="router.push(`/booking?provider=${provider.id}`)"
        />
      </div>
    </div>

    <!-- How It Works Section -->
    <div class="bg-gray-50 py-20">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">{{ $t('landing.how_it_works_title') }}</h2>
          <p class="text-xl text-gray-600">{{ $t('landing.how_it_works_subtitle') }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ $t('landing.steps.browse_title') }}</h3>
            <p class="text-gray-600">{{ $t('landing.steps.browse_desc') }}</p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ $t('landing.steps.time_title') }}</h3>
            <p class="text-gray-600">{{ $t('landing.steps.time_desc') }}</p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ $t('landing.steps.book_title') }}</h3>
            <p class="text-gray-600">{{ $t('landing.steps.book_desc') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center">
          <p class="mb-4">&copy; 2025 Levi. {{ $t('footer.rights') }}</p>
          <div class="flex justify-center gap-6 text-sm">
            <a href="#" class="hover:text-white transition-colors">{{ $t('footer.about') }}</a>
            <a href="#" class="hover:text-white transition-colors">{{ $t('footer.privacy') }}</a>
            <a href="#" class="hover:text-white transition-colors">{{ $t('footer.terms') }}</a>
            <a href="#" class="hover:text-white transition-colors">{{ $t('footer.contact') }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
