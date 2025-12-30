import { supabase } from '../lib/supabase'
import type { Service } from '../types'

export async function fetchServices(providerId?: string) {
    let query = supabase
        .from('services')
        .select(`
            *,
            categories(id, name),
            service_staff (
                staff (
                    id,
                    name,
                    email
                )
            )
        `)
        .order('active', { ascending: false })
        .order('name', { foreignTable: 'categories', ascending: true })
        .order('name', { ascending: true })

    if (providerId) {
        query = query.eq('provider_id', providerId)
    }

    const { data, error } = await query
    if (error) throw error

    // Transform the nested data structure to match the Service interface
    return (data || []).map((service: any) => ({
        ...service,
        staff: service.service_staff?.map((item: any) => item.staff).filter(Boolean) || []
    }))
}

export async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'categories' | 'staff' | 'provider'> & { staff_ids?: string[] }) {
    const { staff_ids, ...serviceData } = service

    // 1. Insert the service
    const { data: insertedData, error: createError } = await supabase
        .from('services')
        .insert([serviceData])
        .select()
        .single()

    if (createError) throw createError

    // 2. Insert staff relations if present
    if (insertedData && staff_ids && staff_ids.length > 0) {
        const staffRelations = staff_ids.map(staffId => ({
            service_id: insertedData.id,
            staff_id: staffId
        }))

        const { error: staffError } = await supabase
            .from('service_staff')
            .insert(staffRelations)

        if (staffError) throw staffError
    }

    // 3. Fetch the complete service with relations
    if (insertedData) {
        const { data: completeData, error: fetchError } = await supabase
            .from('services')
            .select(`
                *,
                categories(id, name),
                service_staff (
                    staff (
                        id,
                        name,
                        email
                    )
                )
            `)
            .eq('id', insertedData.id)
            .single()

        if (fetchError) throw fetchError

        // Transform
        return {
            ...completeData,
            staff: completeData.service_staff?.map((item: any) => item.staff).filter(Boolean) || []
        }
    }
    return insertedData
}

export async function updateService(id: string, updates: Partial<Service> & { staff_ids?: string[] }) {
    // Remove joined data from updates if present
    const { categories, staff, provider, staff_ids, ...cleanUpdates } = updates

    // 1. Update basic service info
    if (Object.keys(cleanUpdates).length > 0) {
        const { error } = await supabase
            .from('services')
            .update(cleanUpdates)
            .eq('id', id)

        if (error) throw error
    }

    // 2. Update staff relations if provided
    if (staff_ids !== undefined) {
        // First delete existing relations
        const { error: deleteError } = await supabase
            .from('service_staff')
            .delete()
            .eq('service_id', id)

        if (deleteError) throw deleteError

        // Then insert new ones
        if (staff_ids.length > 0) {
            const staffRelations = staff_ids.map(staffId => ({
                service_id: id,
                staff_id: staffId
            }))

            const { error: insertError } = await supabase
                .from('service_staff')
                .insert(staffRelations)

            if (insertError) throw insertError
        }
    }

    // 3. Fetch updated service with all relations
    const { data: completeData, error } = await supabase
        .from('services')
        .select(`
            *,
            categories(id, name),
            service_staff (
                staff (
                    id,
                    name,
                    email
                )
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw error

    // Transform
    return {
        ...completeData,
        staff: completeData.service_staff?.map((item: any) => item.staff).filter(Boolean) || []
    }
}

export async function deleteService(id: string) {
    // Soft delete by setting active to false
    const { error } = await supabase
        .from('services')
        .update({ active: false })
        .eq('id', id)

    if (error) throw error
}
