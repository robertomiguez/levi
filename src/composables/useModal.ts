import { ref } from 'vue'

export function useModal<T = any>(initialData: T | null = null) {
    const isOpen = ref(false)
    const data = ref<T | null>(initialData)

    function open(payload: T | null = null) {
        data.value = payload
        isOpen.value = true
    }

    function close() {
        isOpen.value = false
        data.value = null
    }

    return {
        isOpen,
        data,
        open,
        close
    }
}
