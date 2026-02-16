
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBookingFlow } from '../useBookingFlow'
import { useStaffStore } from '../../stores/useStaffStore'
import { useAppointmentStore } from '../../stores/useAppointmentStore'
import { useServiceStore } from '../../stores/useServiceStore'
import { useAuthStore } from '../../stores/useAuthStore'
// import { format } from 'date-fns'

// Mocks
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string) => key
  }),
  createI18n: () => ({
      global: {
          locale: { value: 'en' }
      }
  })
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}))

describe('useBookingFlow Slots', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Mock Auth Store (Fixes "No user logged in" issues if any)
    const authStore = useAuthStore()
    authStore.user = { id: 'user1', email: 'test@example.com' } as any
    authStore.customer = { id: 'cust1', name: 'Test Customer' } as any
  })

  it('loads slots correctly after staff selection', async () => {
    const staffStore = useStaffStore()
    const appointmentStore = useAppointmentStore()
    const serviceStore = useServiceStore()

    // Setup Mock Data
    const serviceId = 'srv1'
    const staffId = 'staff1'
    const today = new Date()

    serviceStore.services = [
      { id: serviceId, name: 'Service A', duration: 60, price: 100, provider_id: 'p1', active: true, buffer_before: 0, buffer_after: 0 } as any
    ]

    staffStore.staff = [
      { id: staffId, name: 'Staff A', email: 'test@example.com', role: 'staff', active: true, provider_id: 'p1' } as any
    ]

    // Mock Availability: Available today 9-17
    const dayOfWeek = today.getDay()
    staffStore.availability = [
      { id: 'avail1', day_of_week: dayOfWeek, is_available: true, start_time: '09:00', end_time: '17:00', staff_id: staffId } as any
    ]
    staffStore.blockedDates = []
    
    // Mock fetch functions
    staffStore.fetchAvailability = vi.fn().mockResolvedValue(staffStore.availability)
    staffStore.fetchBlockedDates = vi.fn().mockResolvedValue([])
    staffStore.fetchStaffAddresses = vi.fn().mockResolvedValue([])

    // Mock Appointments as empty
    appointmentStore.fetchStaffAppointments = vi.fn().mockResolvedValue([])

    // Mock generateSlots
    appointmentStore.generateSlots = vi.fn().mockReturnValue([
        { time: '09:00', available: true },
        { time: '10:00', available: true }
    ])
    appointmentStore.checkAvailability = vi.fn().mockReturnValue(true)

    // Init composable
    const { 
        selectedServiceId, 
        selectedStaffId, 
        availableSlots
        // selectedDate
    } = useBookingFlow()

    // Set Service
    selectedServiceId.value = serviceId
    
    // Set Staff (This triggers the watcher chain)
    // We await check because watcher is async
    // const watcherPromise = new Promise(resolve => setTimeout(resolve, 0)) // tick
    await new Promise(resolve => setTimeout(resolve, 0))
    selectedStaffId.value = staffId
    
    // Wait for watchers to fire and complete
    await new Promise(resolve => setTimeout(resolve, 100)) 

    // Expect fetchAvailability to be called
    expect(staffStore.fetchAvailability).toHaveBeenCalledWith(staffId)

    // Expect slots to be loaded
    // Before fix: This might fail because loadAvailableSlots ran before fetchAvailability completed
    // After fix: It should pass
    expect(availableSlots.value.length).toBeGreaterThan(0)
    expect(availableSlots.value[0]?.time).toBe('09:00')
    
    // Verify reload happened
    expect(appointmentStore.generateSlots).toHaveBeenCalled()
  })
})
