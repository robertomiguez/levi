<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToBooking() {
  router.push('/booking')
}

function goToProviderDashboard() {
  router.push('/provider/dashboard')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-white via-primary-50 to-primary-100">
    <!-- Hero Section -->
    <div class="container mx-auto px-6 py-16">
      <!-- Header/Logo -->
      <div class="text-center mb-16">
        <h1 class="text-6xl font-bold text-primary-600 mb-4 tracking-tight">Levi</h1>
        <p class="text-2xl text-gray-700 font-light">Effortless Appointment Scheduling</p>
        <p class="text-lg text-gray-600 mt-2">Connect with providers or grow your business</p>
      </div>

      <!-- Main Cards -->
      <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        <!-- Customer Card -->
        <div 
          @click="goToBooking"
          class="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1 border-2 border-transparent hover:border-primary-500"
        >
          <div class="text-center">
            <!-- Icon -->
            <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Book an Appointment</h2>
            <p class="text-gray-600 mb-6 text-lg">
              Discover and book appointments with local service providers. From haircuts to massages, find what you need.
            </p>
            
            <!-- Features -->
            <ul class="text-left space-y-3 mb-8">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Browse services and providers</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Real-time availability</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Instant confirmation</span>
              </li>
            </ul>
            
            <button class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
              <span>Get Started</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Provider Card -->
        <div 
          @click="goToProviderDashboard"
          class="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1 border-2 border-transparent hover:border-primary-500"
        >
          <div class="text-center">
            <!-- Icon -->
            <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Provider Dashboard</h2>
            <p class="text-gray-600 mb-6 text-lg">
              Manage your business with powerful tools. Services, staff, schedules, and appointments—all in one place.
            </p>
            
            <!-- Features -->
            <ul class="text-left space-y-3 mb-8">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Service & pricing control</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Staff & availability management</span>
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Real-time calendar & bookings</span>
              </li>
            </ul>
            
            <button class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
              <span>Go to Dashboard</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- How It Works Section -->
      <div class="max-w-4xl mx-auto mb-16">
        <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Step 1 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Browse Services</h3>
            <p class="text-gray-600">Explore services from verified local providers in your area</p>
          </div>
          
          <!-- Step 2 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Pick Your Time</h3>
            <p class="text-gray-600">Select a date and time that works best for your schedule</p>
          </div>
          
          <!-- Step 3 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Book & Done</h3>
            <p class="text-gray-600">Receive instant confirmation and manage your appointments</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-gray-600">
        <p class="mb-2">&copy; 2025 Levi. All rights reserved.</p>
        <div class="flex justify-center gap-6 text-sm">
          <a href="#" class="hover:text-primary-600 transition-colors">About</a>
          <a href="#" class="hover:text-primary-600 transition-colors">Privacy</a>
          <a href="#" class="hover:text-primary-600 transition-colors">Terms</a>
        </div>
      </div>
    </div>
  </div>
</template>
