import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as serviceService from '../services/serviceService'
import type { Service } from '../types'

export const useServiceStore = defineStore('service', () => {
    const services = ref<Service[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Deprecated: fetchServices was redundant with fetchAllServices.
    // We'll keep fetchAllServices as the main entry point.

    async function fetchAllServices(providerId?: string) {
        loading.value = true
        error.value = null
        try {
            const data = await serviceService.fetchServices(providerId)
            services.value = data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch services'
            console.error('[ServiceStore] Error fetching services:', e)
        } finally {
            loading.value = false
        }
    }

    async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'categories' | 'staff' | 'provider' | 'images'> & { staff_ids?: string[], image_urls?: string[] }) {
        // loading.value = true // Removed
        error.value = null
        try {
            const newService = await serviceService.createService(service)
            if (newService) {
                services.value.push(newService)
                return newService
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create service'
            console.error('[ServiceStore] Error creating service:', e)
            throw e
        }
    }

    async function updateService(id: string, updates: Partial<Service> & { staff_ids?: string[], image_urls?: string[] }) {
        error.value = null
        try {
            const updatedService = await serviceService.updateService(id, updates)
            if (updatedService) {
                const index = services.value.findIndex(s => s.id === id)
                if (index !== -1) {
                    services.value[index] = updatedService
                }
            }
            return updatedService
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update service'
            console.error('Error updating service:', e)
            throw e
        }
    }

    async function deleteService(id: string) {
        error.value = null
        try {
            await serviceService.deleteService(id)
            // local update
            const index = services.value.findIndex(s => s.id === id)
            if (index !== -1 && services.value[index]) {
                services.value[index].active = false
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete service'
            console.error('Error deleting service:', e)
            throw e
        }
    }

    return {
        services,
        loading,
        error,
        fetchAllServices,
        createService,
        updateService,
        deleteService
    }
})
