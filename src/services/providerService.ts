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
