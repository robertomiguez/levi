import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { ProviderAddress } from '../types'

export const useAddressStore = defineStore('address', () => {
    const addresses = ref<ProviderAddress[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchAddresses(providerId: string) {
        loading.value = true
        error.value = null
        try {
            const { data, error: fetchError } = await supabase
                .from('provider_addresses')
                .select('*')
                .eq('provider_id', providerId)
                .order('is_primary', { ascending: false })
                .order('created_at', { ascending: true })

            if (fetchError) throw fetchError
            addresses.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch addresses'
            console.error('Error fetching addresses:', e)
        } finally {
            loading.value = false
        }
    }

    async function createAddress(address: Omit<ProviderAddress, 'id' | 'created_at' | 'updated_at'>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: createError } = await supabase
                .from('provider_addresses')
                .insert([address])
                .select()
                .single()

            if (createError) throw createError
            if (data) {
                addresses.value.push(data)
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create address'
            console.error('Error creating address:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateAddress(id: string, updates: Partial<ProviderAddress>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: updateError } = await supabase
                .from('provider_addresses')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError
            if (data) {
                const index = addresses.value.findIndex(a => a.id === id)
                if (index !== -1) {
                    addresses.value[index] = data
                }
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update address'
            console.error('Error updating address:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function deleteAddress(id: string) {
        loading.value = true
        error.value = null
        try {
            const { error: deleteError } = await supabase
                .from('provider_addresses')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            addresses.value = addresses.value.filter(a => a.id !== id)
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete address'
            console.error('Error deleting address:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function setPrimaryAddress(id: string, providerId: string) {
        loading.value = true
        error.value = null
        try {
            // First, unset all as primary
            await supabase
                .from('provider_addresses')
                .update({ is_primary: false })
                .eq('provider_id', providerId)

            // Then set the selected one as primary
            const { data, error: updateError } = await supabase
                .from('provider_addresses')
                .update({ is_primary: true })
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            // Refresh the list
            await fetchAddresses(providerId)
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to set primary address'
            console.error('Error setting primary address:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        addresses,
        loading,
        error,
        fetchAddresses,
        createAddress,
        updateAddress,
        deleteAddress,
        setPrimaryAddress
    }
})
