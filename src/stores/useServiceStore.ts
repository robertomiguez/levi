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
                .select('*')
                .eq('active', true)
                .order('category', { ascending: true })
                .order('name', { ascending: true })

            if (fetchError) throw fetchError
            services.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch services'
            console.error('Error fetching services:', e)
        } finally {
            loading.value = false
        }
    }

    async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) {
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
            console.error('Error creating service:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateService(id: string, updates: Partial<Service>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: updateError } = await supabase
                .from('services')
                .update(updates)
                .eq('id', id)
                .select()
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
            loading.value = false
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
            services.value = services.value.filter(s => s.id !== id)
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
        createService,
        updateService,
        deleteService
    }
})
