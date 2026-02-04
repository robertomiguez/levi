import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Customer, Provider, UserRole } from '../types'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const session = ref<Session | null>(null)
    const customer = ref<Customer | null>(null)
    const provider = ref<Provider | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const isAuthenticated = computed(() => !!user.value)

    // Compute user role based on provider and staff status
    const userRole = computed<UserRole>(() => {
        if (!user.value) return 'customer'

        // Check if user has a provider profile
        if (provider.value) {
            return 'provider'
        }

        // Default to customer
        return 'customer'
    })

    const isProvider = computed(() => userRole.value === 'provider')
    const isAdmin = computed(() => userRole.value === 'admin')

    async function initialize() {
        loading.value = true
        try {
            // Get current session
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            if (currentSession) {
                session.value = currentSession
                user.value = currentSession.user
                await fetchCustomerProfile()
                await fetchProviderProfile()
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, newSession) => {
                session.value = newSession
                user.value = newSession?.user ?? null

                if (newSession?.user) {
                    await fetchCustomerProfile()
                    await fetchProviderProfile()
                } else {
                    customer.value = null
                    provider.value = null
                }
            })
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to initialize auth'
            console.error('Error initializing auth:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchCustomerProfile() {
        if (!user.value) return

        try {
            const { data, error: fetchError } = await supabase
                .from('customers')
                .select('*')
                .eq('auth_user_id', user.value.id)
                .maybeSingle()

            if (fetchError) {
                throw fetchError
            }

            if (!data) {
                customer.value = null
            } else {
                customer.value = data
            }
        } catch (e) {
            console.error('Error fetching customer profile:', e)
        }
    }

    async function createCustomerProfile(initialData?: { name?: string; phone?: string }) {
        if (!user.value) return

        try {
            const { data, error: createError } = await supabase
                .from('customers')
                .insert([{
                    auth_user_id: user.value.id,
                    email: user.value.email!,
                    name: initialData?.name || user.value.user_metadata?.name || user.value.user_metadata?.full_name,
                    phone: initialData?.phone,
                    avatar_url: user.value.user_metadata?.avatar_url || user.value.user_metadata?.picture
                }])
                .select()
                .single()

            if (createError) throw createError
            customer.value = data
        } catch (e) {
            console.error('Error creating customer profile:', e)
        }
    }

    async function fetchProviderProfile() {
        if (!user.value) {
            return
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('providers')
                .select('*')
                .eq('auth_user_id', user.value.id)
                .maybeSingle()

            if (fetchError) {
                throw fetchError
            }

            provider.value = data
        } catch (e) {
            console.error('Error fetching provider profile:', e)
            provider.value = null
        }
    }

    async function sendOtpCode(email: string) {
        loading.value = true
        error.value = null
        try {
            const { error: signInError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true
                }
            })

            if (signInError) throw signInError

            // Success - OTP sent
            return { success: true }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to send verification code'
            console.error('Error sending OTP:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    async function verifyOtpCode(email: string, token: string) {
        loading.value = true
        error.value = null
        try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            })

            if (verifyError) throw verifyError

            if (data.user) {
                user.value = data.user
                session.value = data.session
                // Fetch both customer and provider profiles
                await fetchCustomerProfile()
                await fetchProviderProfile()
            }

            return { success: true }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Invalid verification code'
            console.error('Error verifying OTP:', e)
            throw e
        } finally {
            loading.value = false
        }
    }
    async function signOut() {
        loading.value = true
        error.value = null
        try {
            const { error: signOutError } = await supabase.auth.signOut()
            if (signOutError) throw signOutError

            user.value = null
            session.value = null
            customer.value = null
            provider.value = null
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to sign out'
            console.error('Error signing out:', e)
            throw e
        } finally {
            loading.value = false
        }
    }
    async function updateProfile(updates: Partial<Customer>) {
        if (!customer.value) return

        loading.value = true
        error.value = null
        try {
            const { data, error: updateError } = await supabase
                .from('customers')
                .update(updates)
                .eq('id', customer.value.id)
                .select()
                .single()

            if (updateError) throw updateError
            customer.value = data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update profile'
            console.error('Error updating profile:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        user,
        session,
        customer,
        provider,
        loading,
        error,
        isAuthenticated,
        userRole,
        isProvider,
        isAdmin,
        initialize,
        sendOtpCode,
        verifyOtpCode,
        signOut,
        updateProfile,
        fetchCustomerProfile,
        fetchProviderProfile,
        createCustomerProfile
    }
})
