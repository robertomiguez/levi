export interface Service {
    id: string
    name: string
    duration: number // in minutes
    price?: number
    buffer_before: number
    buffer_after: number
    category?: string
    active: boolean
    created_at?: string
    updated_at?: string
}

export interface Customer {
    id: string
    auth_user_id?: string
    email: string
    name?: string
    phone?: string
    avatar_url?: string
    created_at?: string
    updated_at?: string
}

export interface Staff {
    id: string
    name: string
    email: string
    role: 'admin' | 'staff'
    active: boolean
    created_at?: string
    updated_at?: string
}

export interface Availability {
    id: string
    staff_id: string
    day_of_week: number // 0-6 (Sunday-Saturday)
    start_time: string // HH:mm format
    end_time: string // HH:mm format
    is_available: boolean
}

export interface BlockedDate {
    id: string
    staff_id: string
    start_date: string // YYYY-MM-DD
    end_date: string // YYYY-MM-DD
    reason?: string
}

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'no-show'

export interface Appointment {
    id: string
    service_id: string
    staff_id: string
    customer_id: string // Now references customers table
    appointment_date: string // YYYY-MM-DD
    start_time: string // HH:mm format
    end_time: string // HH:mm format
    status: AppointmentStatus
    notes?: string
    created_at?: string
    updated_at?: string
    customer?: Customer // Joined data
}

export interface TimeSlot {
    time: string // HH:mm format
    available: boolean
    reason?: string // Why it's not available
}
