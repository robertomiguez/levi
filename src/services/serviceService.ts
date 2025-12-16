import { supabase } from '../lib/supabase'
import type { Service } from '../types'

export async function fetchServices(providerId?: string) {
    let query = supabase
        .from('services')
        .select('*, categories(id, name)')
        .order('active', { ascending: false })
        .order('name', { foreignTable: 'categories', ascending: true })
        .order('name', { ascending: true })

    if (providerId) {
        query = query.eq('provider_id', providerId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
}

export async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'categories'>) {
    // 1. Insert the service
    const { data: insertedData, error: createError } = await supabase
        .from('services')
        .insert([service])
        .select()
        .single()

    if (createError) throw createError

    // 2. Fetch the complete service with relations
    if (insertedData) {
        const { data: completeData, error: fetchError } = await supabase
            .from('services')
            .select('*, categories(id, name)')
            .eq('id', insertedData.id)
            .single()

        if (fetchError) throw fetchError
        return completeData
    }
    return insertedData
}

export async function updateService(id: string, updates: Partial<Service>) {
    // Remove joined data from updates if present
    const { categories, ...cleanUpdates } = updates

    const { data, error } = await supabase
        .from('services')
        .update(cleanUpdates)
        .eq('id', id)
        .select('*, categories(id, name)')
        .single()

    if (error) throw error
    return data
}

export async function deleteService(id: string) {
    // Soft delete by setting active to false
    const { error } = await supabase
        .from('services')
        .update({ active: false })
        .eq('id', id)

    if (error) throw error
}
