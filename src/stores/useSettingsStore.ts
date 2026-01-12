import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '../lib/i18n'

export const useSettingsStore = defineStore('settings', () => {
  const language = ref<string>(localStorage.getItem('language') || 'en')

  function setLanguage(lang: string) {
    language.value = lang
    localStorage.setItem('language', lang)
    if (i18n.global) {
      // @ts-ignore
      i18n.global.locale.value = lang
    }
  }

  return {
    language,
    setLanguage
  }
})
