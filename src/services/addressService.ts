import { supabase } from '../lib/supabase'
import type { ProviderAddress } from '../types'

export async function fetchAddresses(providerId: string) {
    const { data, error } = await supabase
        .from('provider_addresses')
        .select('*')
        .eq('provider_id', providerId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
}

export async function createAddress(address: Omit<ProviderAddress, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
        .from('provider_addresses')
        .insert([address])
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateAddress(id: string, updates: Partial<ProviderAddress>) {
    const { data, error } = await supabase
        .from('provider_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteAddress(id: string) {
    const { error } = await supabase
        .from('provider_addresses')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function setPrimaryAddress(id: string, providerId: string) {
    // First, unset all as primary
    await supabase
        .from('provider_addresses')
        .update({ is_primary: false })
        .eq('provider_id', providerId)

    // Then set the selected one as primary
    const { data, error } = await supabase
        .from('provider_addresses')
        .update({ is_primary: true })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}
