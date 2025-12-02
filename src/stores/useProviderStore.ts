import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { Provider } from '../types'

export const useProviderStore = defineStore('provider', () => {
    const provider = ref<Provider | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Dashboard stats
    const stats = ref({
        todayAppointments: 0,
        weekAppointments: 0,
        monthAppointments: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        activeServices: 0,
        totalStaff: 0
    })

    const isApproved = computed(() => provider.value?.status === 'approved')
    const isPending = computed(() => provider.value?.status === 'pending')

    async function fetchProvider(authUserId: string) {
        loading.value = true
        error.value = null
        try {
            const { data, error: fetchError } = await supabase
                .from('providers')
                .select('*')
                .eq('auth_user_id', authUserId)
                .single()

            if (fetchError) throw fetchError
            provider.value = data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch provider'
            console.error('Error fetching provider:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchDashboardStats(providerId: string) {
        if (!providerId) return

        try {
            // Get today's date range
            const today = new Date()
            const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString()
            const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString()

            // Get this week's date range
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - today.getDay())
            weekStart.setHours(0, 0, 0, 0)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 7)

            // Get this month's date range
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

            // Fetch today's appointments
            const { data: todayAppts } = await supabase
                .from('appointments')
                .select('*, services!inner(provider_id, price)')
                .gte('appointment_date', todayStart.split('T')[0])
                .lte('appointment_date', todayEnd.split('T')[0])
                .eq('services.provider_id', providerId)

            // Fetch week's appointments
            const { data: weekAppts } = await supabase
                .from('appointments')
                .select('*, services!inner(provider_id, price)')
                .gte('appointment_date', weekStart.toISOString().split('T')[0])
                .lt('appointment_date', weekEnd.toISOString().split('T')[0])
                .eq('services.provider_id', providerId)

            // Fetch month's appointments
            const { data: monthAppts } = await supabase
                .from('appointments')
                .select('*, services!inner(provider_id, price)')
                .gte('appointment_date', monthStart.toISOString().split('T')[0])
                .lte('appointment_date', monthEnd.toISOString().split('T')[0])
                .eq('services.provider_id', providerId)

            // Fetch active services count
            const { count: servicesCount } = await supabase
                .from('services')
                .select('*', { count: 'exact', head: true })
                .eq('provider_id', providerId)
                .eq('active', true)

            // Fetch staff count
            const { count: staffCount } = await supabase
                .from('staff')
                .select('*', { count: 'exact', head: true })
                .eq('provider_id', providerId)
                .eq('active', true)

            // Calculate stats
            stats.value.todayAppointments = todayAppts?.length || 0
            stats.value.weekAppointments = weekAppts?.length || 0
            stats.value.monthAppointments = monthAppts?.length || 0

            // Calculate revenue (sum of service prices)
            stats.value.weekRevenue = weekAppts?.reduce((sum, apt: any) => {
                return sum + (apt.services?.price || 0)
            }, 0) || 0

            stats.value.monthRevenue = monthAppts?.reduce((sum, apt: any) => {
                return sum + (apt.services?.price || 0)
            }, 0) || 0

            stats.value.activeServices = servicesCount || 0
            stats.value.totalStaff = staffCount || 0

        } catch (e) {
            console.error('Error fetching dashboard stats:', e)
        }
    }

    async function updateProvider(providerId: string, updates: Partial<Provider>) {
        loading.value = true
        error.value = null
        try {
            const { data, error: updateError } = await supabase
                .from('providers')
                .update(updates)
                .eq('id', providerId)
                .select()
                .single()

            if (updateError) throw updateError
            provider.value = data
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update provider'
            console.error('Error updating provider:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        provider,
        loading,
        error,
        stats,
        isApproved,
        isPending,
        fetchProvider,
        fetchDashboardStats,
        updateProvider
    }
})
