import { supabase } from '../lib/supabase'
import { uploadLogo, deleteLogo } from '../lib/storage'

export async function saveProvider({
    user,
    provider,
    form,
    logoFile
}: {
    user: any
    provider?: any
    form: any
    logoFile?: File | null
}) {
    let logo_url = provider?.logo_url ?? null
    let logo_path = provider?.logo_path ?? null

    if (logoFile) {
        // delete old
        await deleteLogo(logo_path)

        // upload new
        const uploaded = await uploadLogo(user.id, logoFile)
        logo_url = uploaded.url
        logo_path = uploaded.path
    }

    if (provider) {
        // UPDATE
        const { error } = await supabase
            .from('providers')
            .update({
                business_name: form.business_name,
                phone: form.phone,
                description: form.description,
                logo_url,
                logo_path
            })
            .eq('id', provider.id)

        if (error) throw error
    } else {
        // INSERT
        const { error } = await supabase
            .from('providers')
            .insert({
                auth_user_id: user.id,
                email: user.email,
                business_name: form.business_name,
                phone: form.phone,
                description: form.description,
                logo_url,
                logo_path,
                status: 'approved',
                approved_at: new Date().toISOString()
            })

        if (error) throw error
    }
}

export async function fetchDashboardStats(providerId: string) {
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
    const { data: todayAppts, error: todayError } = await supabase
        .from('appointments')
        .select('*, services!inner(provider_id, price)')
        .gte('appointment_date', todayStart.split('T')[0])
        .lte('appointment_date', todayEnd.split('T')[0])
        .eq('services.provider_id', providerId)
    
    if (todayError) throw todayError

    // Fetch week's appointments
    const { data: weekAppts, error: weekError } = await supabase
        .from('appointments')
        .select('*, services!inner(provider_id, price)')
        .gte('appointment_date', weekStart.toISOString().split('T')[0])
        .lt('appointment_date', weekEnd.toISOString().split('T')[0])
        .eq('services.provider_id', providerId)

    if (weekError) throw weekError

    // Fetch month's appointments
    const { data: monthAppts, error: monthError } = await supabase
        .from('appointments')
        .select('*, services!inner(provider_id, price)')
        .gte('appointment_date', monthStart.toISOString().split('T')[0])
        .lte('appointment_date', monthEnd.toISOString().split('T')[0])
        .eq('services.provider_id', providerId)

    if (monthError) throw monthError

    // Fetch active services count
    const { count: servicesCount, error: servicesError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('active', true)
    
    if (servicesError) throw servicesError

    // Fetch staff count
    const { count: staffCount, error: staffError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('active', true)
    
    if (staffError) throw staffError

    // Calculate revenue using booked_price (locked at time of booking)
    const weekRevenue = weekAppts?.reduce((sum, apt: any) => sum + (apt.booked_price || 0), 0) || 0
    const monthRevenue = monthAppts?.reduce((sum, apt: any) => sum + (apt.booked_price || 0), 0) || 0

    return {
        todayAppointments: todayAppts?.length || 0,
        weekAppointments: weekAppts?.length || 0,
        monthAppointments: monthAppts?.length || 0,
        weekRevenue,
        monthRevenue,
        activeServices: servicesCount || 0,
        totalStaff: staffCount || 0
    }
}
