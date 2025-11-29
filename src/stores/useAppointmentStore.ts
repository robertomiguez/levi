import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { addMinutes, format, parse, isAfter, isBefore, isSameDay } from 'date-fns'
import type { Appointment, TimeSlot } from '../types'

export const useAppointmentStore = defineStore('appointment', () => {
    const appointments = ref<Appointment[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchAppointments(startDate?: string, endDate?: string) {
        loading.value = true
        error.value = null
        try {
            let query = supabase
                .from('appointments')
                .select(`
                    *,
                    customer:customers(id, name, email, phone, avatar_url)
                `)
                .order('appointment_date', { ascending: true })
                .order('start_time', { ascending: true })

            if (startDate) {
                query = query.gte('appointment_date', startDate)
            }
            if (endDate) {
                query = query.lte('appointment_date', endDate)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError
            appointments.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch appointments'
            console.error('Error fetching appointments:', e)
        } finally {
            loading.value = false
        }
    }

    async function createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: createError } = await supabase
                .from('appointments')
                .insert([appointment])
                .select()
                .single()

            if (createError) throw createError
            if (data) {
                appointments.value.push(data)
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create appointment'
            console.error('Error creating appointment:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateAppointment(id: string, updates: Partial<Appointment>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: updateError } = await supabase
                .from('appointments')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError
            if (data) {
                const index = appointments.value.findIndex(a => a.id === id)
                if (index !== -1) {
                    appointments.value[index] = data
                }
            }
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update appointment'
            console.error('Error updating appointment:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function deleteAppointment(id: string) {
        loading.value = true
        error.value = null
        try {
            const { error: deleteError } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            appointments.value = appointments.value.filter(a => a.id !== id)
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete appointment'
            console.error('Error deleting appointment:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * THE AVAILABILITY ENGINE - The "brain" of the scheduling system
     * Calculates available time slots for a given service, staff, and date
     */
    async function getAvailableSlots(
        serviceId: string,
        staffId: string,
        date: Date
    ): Promise<TimeSlot[]> {
        try {
            // 1. Get service details (duration, buffers)
            const { data: service } = await supabase
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .single()

            if (!service) throw new Error('Service not found')

            // 2. Get staff availability for this day of week
            const dayOfWeek = date.getDay()
            const { data: availability } = await supabase
                .from('availability')
                .select('*')
                .eq('staff_id', staffId)
                .eq('day_of_week', dayOfWeek)
                .eq('is_available', true)

            if (!availability || availability.length === 0) {
                return [] // Not available on this day
            }

            // 3. Check for blocked dates
            const dateStr = format(date, 'yyyy-MM-dd')
            const { data: blockedDates } = await supabase
                .from('blocked_dates')
                .select('*')
                .eq('staff_id', staffId)
                .lte('start_date', dateStr)
                .gte('end_date', dateStr)

            if (blockedDates && blockedDates.length > 0) {
                return [] // Staff is blocked on this date
            }

            // 4. Get existing appointments for this staff on this date
            const { data: existingAppointments } = await supabase
                .from('appointments')
                .select('*')
                .eq('staff_id', staffId)
                .eq('appointment_date', dateStr)
                .in('status', ['confirmed', 'pending'])

            // 5. Generate time slots
            const slots: TimeSlot[] = []
            const slotInterval = 15 // 15-minute intervals
            const totalDuration = service.duration + service.buffer_before + service.buffer_after

            for (const avail of availability) {
                const startTime = parse(avail.start_time, 'HH:mm:ss', date)
                const endTime = parse(avail.end_time, 'HH:mm:ss', date)

                let currentSlot = startTime

                while (isBefore(currentSlot, endTime)) {
                    const slotStart = currentSlot
                    const slotEnd = addMinutes(currentSlot, totalDuration)

                    // Check if slot extends past business hours
                    if (isAfter(slotEnd, endTime)) {
                        break
                    }

                    // Check for conflicts with existing appointments
                    let hasConflict = false
                    if (existingAppointments) {
                        for (const appt of existingAppointments) {
                            const apptStart = parse(appt.start_time, 'HH:mm:ss', date)
                            const apptEnd = parse(appt.end_time, 'HH:mm:ss', date)

                            // Check overlap
                            if (
                                (isBefore(slotStart, apptEnd) && isAfter(slotEnd, apptStart)) ||
                                isSameDay(slotStart, apptStart) && slotStart.getTime() === apptStart.getTime()
                            ) {
                                hasConflict = true
                                break
                            }
                        }
                    }

                    slots.push({
                        time: format(slotStart, 'HH:mm'),
                        available: !hasConflict,
                        reason: hasConflict ? 'Already booked' : undefined
                    })

                    currentSlot = addMinutes(currentSlot, slotInterval)
                }
            }

            return slots.filter(slot => slot.available)
        } catch (e) {
            console.error('Error calculating available slots:', e)
            throw e
        }
    }

    return {
        appointments,
        loading,
        error,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        getAvailableSlots
    }
})
