import { computed } from 'vue'

export function useCurrency() {
    const targetCurrency = computed(() => {
        // Use navigator.language to respect browser settings, independent of UI language
        const l = (navigator.language || 'en-US').toLowerCase()
        
        if (l.startsWith('en-ca') || l.startsWith('fr-ca')) return 'cad'
        if (l.startsWith('en-gb')) return 'gbp'
        if (l.startsWith('pt-br')) return 'brl'
        
        // Eurozone approximation
        const euroLocales = ['fr', 'de', 'it', 'es', 'pt', 'nl', 'be', 'at', 'fi', 'ie']
        if (euroLocales.some(el => l === el || l.startsWith(`${el}-`))) return 'eur'
        
        return 'usd'
    })

    const currencySymbol = computed(() => {
        switch (targetCurrency.value) {
            case 'eur': return '€'
            case 'gbp': return '£'
            case 'brl': return 'R$'
            case 'cad': return 'CA$'
            default: return '$'
        }
    })

    const currencyLocale = computed(() => {
        // Return a locale string suitable for Intl.NumberFormat
        // corresponding to the detected currency
        switch (targetCurrency.value) {
            case 'eur': return 'de-DE' // or another major euro locale
            case 'gbp': return 'en-GB'
            case 'brl': return 'pt-BR'
            case 'cad': return 'en-CA'
            default: return 'en-US'
        }
    })

    function formatPrice(amount: number, currencyCode?: string): string {
        const code = currencyCode || targetCurrency.value
        // Map our simple codes to ISO currency codes if needed, 
        // though they match mostly (eur, gbp, brl, cad, usd)
        
        return new Intl.NumberFormat(currencyLocale.value, {
            style: 'currency',
            currency: code.toUpperCase()
        }).format(amount)
    }

    return {
        targetCurrency,
        currencySymbol,
        formatPrice
    }
}
