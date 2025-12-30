export interface Category {
    id: string
    name: string
    created_at?: string
}

export interface Service {
    id: string
    name: string
    duration: number // in minutes
    price?: number
    buffer_before: number
    buffer_after: number
    category_id?: string // References categories table
    categories?: Category // Joined data
    description?: string
    image_url?: string
    active: boolean
    provider_id?: string // References providers table
    created_at?: string
    updated_at?: string
    provider?: Provider // Joined data
    staff?: Staff[] // Joined data
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

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Provider {
    id: string
    auth_user_id?: string
    business_name: string
    email: string
    phone?: string
    description?: string
    logo_url?: string
    logo_path?: string
    avatar_url?: string
    status: ProviderStatus
    approved_by?: string // References staff table
    approved_at?: string
    rejection_reason?: string
    created_at?: string
    updated_at?: string
}

export interface Staff {
    id: string
    name: string
    email: string
    role: 'admin' | 'staff'
    active: boolean
    provider_id?: string // References providers table
    created_at?: string
    updated_at?: string
}

export interface ProviderAddress {
    id: string
    provider_id: string
    label?: string // e.g., "Main Location", "Downtown Branch"
    street_address: string
    street_address_2?: string // Apt, Suite, etc.
    city: string
    state?: string
    postal_code: string
    country: string
    is_primary: boolean
    latitude?: number
    longitude?: number
    created_at?: string
    updated_at?: string
}

export interface Availability {
    id: string
    staff_id: string
    provider_id?: string // References providers table
    day_of_week: number // 0-6 (Sunday-Saturday)
    start_time: string // HH:mm format
    end_time: string // HH:mm format
    is_available: boolean
}

export interface BlockedDate {
    id: string
    staff_id: string
    provider_id?: string // References providers table
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

export type UserRole = 'customer' | 'provider' | 'admin'
