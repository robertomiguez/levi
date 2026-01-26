<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'

const props = defineProps<{
  documentType: 'terms' | 'privacy'
}>()

const { locale } = useI18n()

const documentContent = computed(() => {
  try {
    // Dynamic import based on locale and document type
    const lang = locale.value === 'pt' ? 'pt' : locale.value === 'fr' ? 'fr' : 'en'
    const fileName = props.documentType === 'terms' ? 'terms-of-service' : 'privacy-policy'
    
    // Import the markdown file
    const modules = import.meta.glob('@/legal/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const path = `/src/legal/${fileName}.${lang}.md`
    
    return modules[path] || modules[`/src/legal/${fileName}.en.md`] || ''
  } catch (error) {
    console.error('Error loading legal document:', error)
    return ''
  }
})

const htmlContent = computed(() => {
  try {
    return marked.parse(documentContent.value)
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return ''
  }
})
</script>

<template>
  <div class="legal-document-viewer">
    <div class="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none">
      <div v-html="htmlContent"></div>
    </div>
  </div>
</template>

<style scoped>
.legal-document-viewer {
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .legal-document-viewer {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .legal-document-viewer {
    padding: 2.5rem;
  }
}

.prose {
  color: hsl(var(--foreground));
  max-width: none;
}

.prose :deep(h1) {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: hsl(var(--foreground));
}

.prose :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 0.5rem;
}

.prose :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: hsl(var(--foreground));
}

.prose :deep(p) {
  margin-bottom: 1rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.625;
}

.prose :deep(ul), .prose :deep(ol) {
  margin-bottom: 1rem;
  margin-left: 1.5rem;
  color: hsl(var(--muted-foreground));
}

.prose :deep(li) {
  margin-bottom: 0.5rem;
}

.prose :deep(strong) {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.prose :deep(a) {
  color: hsl(var(--primary));
}

.prose :deep(a:hover) {
  text-decoration: underline;
}

.prose :deep(hr) {
  margin-top: 2rem;
  margin-bottom: 2rem;
  border-color: hsl(var(--border));
}

.prose :deep(blockquote) {
  border-left: 4px solid hsl(var(--primary));
  padding-left: 1rem;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}
</style>
