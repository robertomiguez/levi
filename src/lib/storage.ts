import { supabase } from "./supabase"

const BUCKET = 'provider-logos'

// Polyfill for crypto.randomUUID() to support all browsers, especially mobile
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    // Fallback UUID v4 implementation for browsers without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

export async function uploadLogo(userId: string, file: File) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${generateUUID()}.${ext}`

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false })

    if (error) throw error

    const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path)

    return {
        url: data.publicUrl,
        path
    }
}

export async function deleteLogo(path?: string | null) {
    if (!path) return

    const { error } = await supabase.storage
        .from(BUCKET)
        .remove([path])

    if (error) {
        console.warn('Failed to delete logo:', error)
    }
}
