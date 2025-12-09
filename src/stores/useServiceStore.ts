import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Service } from '../types'

export const useServiceStore = defineStore('service', () => {
    const services = ref<Service[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchServices() {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('services')
                .select('*, categories(id, name)')
                .eq('active', true)
                .order('name', { foreignTable: 'categories', ascending: true })
                .order('name', { ascending: true })



            if (fetchError) {
                console.error('[ServiceStore] Fetch error:', fetchError)
                throw fetchError
            }

            services.value = data || []

        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch services'
            console.error('[ServiceStore] Error fetching services:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchAllServices(providerId?: string) {
        loading.value = true
        error.value = null
        try {
            let query = supabase
                .from('services')
                .select('*, categories(id, name)')
                .order('active', { ascending: false })
                .order('name', { foreignTable: 'categories', ascending: true })
                .order('name', { ascending: true })

            if (providerId) {
                query = query.eq('provider_id', providerId)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            services.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch services'
            console.error('[ServiceStore] Error fetching services:', e)
        } finally {
            loading.value = false
        }
    }

    async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'categories'>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: createError } = await supabase
                .from('services')
                .insert([service])
                .select()
                .single()

            if (createError) throw createError

            if (data) {
                services.value.push(data)
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create service'
            console.error('[ServiceStore] Error creating service:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateService(id: string, updates: Partial<Service>) {
        // loading.value = true // Removed to prevent UI flash
        error.value = null
        try {
            // Remove joined data from updates if present
            const { categories, ...cleanUpdates } = updates

            const { data, error: updateError } = await supabase
                .from('services')
                .update(cleanUpdates)
                .eq('id', id)
                .select('*, categories(id, name)')
                .single()

            if (updateError) throw updateError
            if (data) {
                const index = services.value.findIndex(s => s.id === id)
                if (index !== -1) {
                    services.value[index] = data
                }
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update service'
            console.error('Error updating service:', e)
            throw e
        } finally {
            // loading.value = false // Removed to prevent UI flash
        }
    }

    async function deleteService(id: string) {
        loading.value = true
        error.value = null
        try {
            // Soft delete by setting active to false
            const { error: deleteError } = await supabase
                .from('services')
                .update({ active: false })
                .eq('id', id)

            if (deleteError) throw deleteError
            // Don't remove from array anymore, just update it
            const index = services.value.findIndex(s => s.id === id)
            if (index !== -1 && services.value[index]) {
                services.value[index].active = false
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete service'
            console.error('Error deleting service:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        services,
        loading,
        error,
        fetchServices,
        fetchAllServices,
        createService,
        updateService,
        deleteService
    }
})
