import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export const useCategoryStore = defineStore('category', () => {
    const categories = ref<Category[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchCategories() {
        loading.value = true
        error.value = null
        try {
            const { data, error: fetchError } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true })

            if (fetchError) throw fetchError
            categories.value = data || []
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
            console.error('Error fetching categories:', e)
        } finally {
            loading.value = false
        }
    }

    return {
        categories,
        loading,
        error,
        fetchCategories
    }
})
