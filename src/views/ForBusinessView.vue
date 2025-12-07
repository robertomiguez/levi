<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

function goToRegister() {
  router.push('/provider/register')
}

function goToDashboard() {
  if (authStore.provider) {
    router.push('/provider/dashboard')
  } else {
    router.push('/provider/register')
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section -->
    <div class="bg-gradient-to-br from-purple-600 via-primary-600 to-blue-600 text-white">
      <div class="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div class="max-w-3xl">
          <h1 class="text-5xl lg:text-6xl font-bold mb-6">
            Grow Your Business with Levi
          </h1>
          <p class="text-xl lg:text-2xl mb-8 text-purple-100">
            The all-in-one platform for service providers. Manage services, staff, schedules, and bookings effortlessly.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <button
              @click="goToRegister"
              class="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Get Started Free
            </button>
            <button
              v-if="authStore.provider"
              @click="goToDashboard"
              class="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white hover:text-primary-600 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="max-w-7xl mx-auto px-6 py-20">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Run Your Business</h2>
        <p class="text-xl text-gray-600">Powerful tools designed for service professionals</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Service Management -->
        <div class="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:shadow-lg transition-all">
          <div class="w-14 h-14 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Service Management</h3>
          <p class="text-gray-600">Create and manage your service offerings with custom pricing and durations</p>
        </div>

        <!-- Staff Management -->
        <div class="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-purple-500 hover:shadow-lg transition-all">
          <div class="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Team Management</h3>
          <p class="text-gray-600">Add team members and manage their schedules and availability</p>
        </div>

        <!-- Calendar -->
        <div class="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-green-500 hover:shadow-lg transition-all">
          <div class="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Smart Calendar</h3>
          <p class="text-gray-600">View all appointments in one place with real-time updates</p>
        </div>

        <!-- Locations -->
        <div class="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-orange-500 hover:shadow-lg transition-all">
          <div class="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Multiple Locations</h3>
          <p class="text-gray-600">Manage multiple service locations and branches from one account</p>
        </div>

        <!-- Availability -->
        <div class="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:shadow-lg transition-all">
          <div class="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Flexible Scheduling</h3>
          <p class="text-gray-600">Set your hours, manage availability, and block out time when needed</p>
        </div>

        <!-- Real-time Bookings -->
        <div class="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-indigo-500 hover:shadow-lg transition-all">
          <div class="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Instant Bookings</h3>
          <p class="text-gray-600">Accept bookings 24/7 with automatic confirmations</p>
        </div>
      </div>
    </div>

    <!-- How It Works -->
    <div class="bg-gray-50 py-20">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Get Started in Minutes</h2>
          <p class="text-xl text-gray-600">Simple setup, powerful results</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Create Your Account</h3>
            <p class="text-gray-600">Sign up in seconds and set up your business profile</p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Add Your Services</h3>
            <p class="text-gray-600">List your services, set prices, and configure your availability</p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">Start Accepting Bookings</h3>
            <p class="text-gray-600">Go live and start receiving bookings from customers</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="bg-gradient-to-r from-primary-600 to-purple-600 text-white py-20">
      <div class="max-w-4xl mx-auto px-6 text-center">
        <h2 class="text-4xl font-bold mb-6">Ready to Grow Your Business?</h2>
        <p class="text-xl mb-8 text-purple-100">
          Join hundreds of service providers who trust Levi to manage their bookings
        </p>
        <button
          @click="goToRegister"
          class="px-10 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
        >
          Get Started Free
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center">
          <p class="mb-4">&copy; 2025 Levi. All rights reserved.</p>
          <div class="flex justify-center gap-6 text-sm">
            <a href="#" class="hover:text-white transition-colors">About</a>
            <a href="#" class="hover:text-white transition-colors">Privacy</a>
            <a href="#" class="hover:text-white transition-colors">Terms</a>
            <a href="#" class="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
