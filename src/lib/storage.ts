import { supabase } from "./supabase"

const BUCKET = 'provider-logos'

export async function uploadLogo(userId: string, file: File) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${crypto.randomUUID()}.${ext}`

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
