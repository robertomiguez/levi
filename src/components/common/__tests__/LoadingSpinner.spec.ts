import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from '../LoadingSpinner.vue'
import { Loader2 } from 'lucide-vue-next'

describe('LoadingSpinner.vue', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(LoadingSpinner)
    // Check for Loader2 component
    expect(wrapper.findComponent(Loader2).exists()).toBe(true)
    const loader = wrapper.findComponent(Loader2)
    expect(loader.classes()).toContain('h-12') // Default size lg
    expect(loader.classes()).toContain('text-primary-600') // Default color
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders text when provided', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        text: 'Loading data...'
      }
    })
    expect(wrapper.text()).toContain('Loading data...')
  })

  it('applies size classes correctly', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        size: 'sm'
      }
    })
    const loader = wrapper.findComponent(Loader2)
    expect(loader.classes()).toContain('h-4')
  })

  it('applies color classes correctly', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        color: 'text-red-500'
      }
    })
    const loader = wrapper.findComponent(Loader2)
    expect(loader.classes()).toContain('text-red-500')
  })

  it('applies fullscreen classes when fullscreen prop is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        fullscreen: true
      }
    })
    const container = wrapper.find('.fixed.inset-0')
    expect(container.exists()).toBe(true)
    expect(container.classes()).toContain('z-50')
  })

  it('renders inline correctly', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        inline: true
      }
    })
    // Should NOT have the wrapper div
    expect(wrapper.find('div.flex.flex-col').exists()).toBe(false)
    // Should have Loader2 directly
    expect(wrapper.findComponent(Loader2).exists()).toBe(true)
  })
})
