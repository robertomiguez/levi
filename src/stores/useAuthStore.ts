import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Customer } from '../types'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const session = ref<Session | null>(null)
    const customer = ref<Customer | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const isAuthenticated = computed(() => !!user.value)

    async function initialize() {
        loading.value = true
        try {
            // Get current session
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            if (currentSession) {
                session.value = currentSession
                user.value = currentSession.user
                await fetchCustomerProfile()
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, newSession) => {
                session.value = newSession
                user.value = newSession?.user ?? null

                if (newSession?.user) {
                    await fetchCustomerProfile()
                } else {
                    customer.value = null
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
                .single()

            if (fetchError) {
                // Customer profile doesn't exist yet, create it
                if (fetchError.code === 'PGRST116') {
                    await createCustomerProfile()
                } else {
                    throw fetchError
                }
            } else {
                customer.value = data
            }
        } catch (e) {
            console.error('Error fetching customer profile:', e)
        }
    }

    async function createCustomerProfile() {
        if (!user.value) return

        try {
            const { data, error: createError } = await supabase
                .from('customers')
                .insert([{
                    auth_user_id: user.value.id,
                    email: user.value.email!,
                    name: user.value.user_metadata?.name || user.value.user_metadata?.full_name,
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

    async function signInWithMagicLink(email: string) {
        loading.value = true
        error.value = null
        try {
            const { error: signInError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/`
                }
            })

            if (signInError) throw signInError

            // Success - magic link sent
            return { success: true }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to send magic link'
            console.error('Error sending magic link:', e)
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
        loading,
        error,
        isAuthenticated,
        initialize,
        signInWithMagicLink,
        signOut,
        updateProfile,
        fetchCustomerProfile
    }
})
