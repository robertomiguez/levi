import { supabase } from '../lib/supabase'
import type { Availability, BlockedDate } from '../types'

export async function fetchAvailability(staffId: string) {
    const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('staff_id', staffId)
        .order('day_of_week')

    if (error) throw error
    return data || []
}

export async function upsertAvailability(availabilities: any[]) {
    // Clean data before upserting (remove temp IDs if any, though caller usually handles this)
    // Supabase upsert requires minimal cleaning if types match
    const { data, error } = await supabase
        .from('availability')
        .upsert(availabilities)
        .select()

    if (error) throw error
    return data
}

export async function fetchBlockedDates(staffId: string) {
    const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('staff_id', staffId)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date')

    if (error) throw error
    return data || []
}

export async function createBlockedDate(blockedDate: Omit<BlockedDate, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('blocked_dates')
        .insert([blockedDate])
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteBlockedDate(id: string) {
    const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id)

    if (error) throw error
}
