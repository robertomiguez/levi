import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Staff, Availability, BlockedDate } from '../types'

export const useStaffStore = defineStore('staff', () => {
    const staff = ref<Staff[]>([])
    const availability = ref<Availability[]>([])
    const blockedDates = ref<BlockedDate[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchStaff() {
        loading.value = true
        error.value = null
        try {
            const { data, error: fetchError } = await supabase
                .from('staff')
                .select('*')
                .eq('active', true)
                .order('name', { ascending: true })

            if (fetchError) throw fetchError
            staff.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch staff'
            console.error('Error fetching staff:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchAvailability(staffId?: string) {
        loading.value = true
        error.value = null
        try {
            let query = supabase.from('availability').select('*')

            if (staffId) {
                query = query.eq('staff_id', staffId)
            }

            const { data, error: fetchError } = await query.order('day_of_week')

            if (fetchError) throw fetchError
            availability.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch availability'
            console.error('Error fetching availability:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchBlockedDates(staffId?: string) {
        loading.value = true
        error.value = null
        try {
            let query = supabase.from('blocked_dates').select('*')

            if (staffId) {
                query = query.eq('staff_id', staffId)
            }

            const { data, error: fetchError } = await query.order('start_date')

            if (fetchError) throw fetchError
            blockedDates.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch blocked dates'
            console.error('Error fetching blocked dates:', e)
        } finally {
            loading.value = false
        }
    }

    async function upsertAvailability(staffId: string, availabilityData: Omit<Availability, 'id'>[]) {
        loading.value = true
        error.value = null
        try {
            // Delete existing availability for this staff member
            await supabase.from('availability').delete().eq('staff_id', staffId)

            // Insert new availability
            const { error: upsertError } = await supabase
                .from('availability')
                .insert(availabilityData)

            if (upsertError) throw upsertError
            await fetchAvailability(staffId)
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to save availability'
            console.error('Error saving availability:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function createBlockedDate(blockedDate: Omit<BlockedDate, 'id'>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: createError } = await supabase
                .from('blocked_dates')
                .insert([blockedDate])
                .select()
                .single()

            if (createError) throw createError
            if (data) {
                blockedDates.value.push(data)
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create blocked date'
            console.error('Error creating blocked date:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function deleteBlockedDate(id: string) {
        loading.value = true
        error.value = null
        try {
            const { error: deleteError } = await supabase
                .from('blocked_dates')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            blockedDates.value = blockedDates.value.filter(bd => bd.id !== id)
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete blocked date'
            console.error('Error deleting blocked date:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        staff,
        availability,
        blockedDates,
        loading,
        error,
        fetchStaff,
        fetchAvailability,
        fetchBlockedDates,
        upsertAvailability,
        createBlockedDate,
        deleteBlockedDate
    }
})
