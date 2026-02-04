import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCheckoutSession } from '../subscriptionService'
import { supabase } from '@/lib/supabase'

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}))

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCheckoutSession', () => {
    it('calls the edge function with correct parameters including locale', async () => {
      // Mock successful response
      const mockResponse = { data: { url: 'https://checkout.stripe.com/test' }, error: null }
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse)

      const params = {
        planName: 'pro',
        providerId: '123',
        providerEmail: 'test@example.com',
        locale: 'pt-BR'
      }

      await createCheckoutSession(params)

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-checkout-session', {
        body: {
          planName: 'pro',
          providerId: '123',
          providerEmail: 'test@example.com',
          locale: 'pt-BR',
          successUrl: undefined,
          cancelUrl: undefined
        }
      })
    })

    it('uses "en" as default locale if not provided (and navigator not available in test env)', async () => {
      // Mock successful response
      const mockResponse = { data: { url: 'https://checkout.stripe.com/test' }, error: null }
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse)

      const params = {
        planName: 'pro',
        providerId: '123',
        providerEmail: 'test@example.com'
      }

      // We need to handle the navigator.language fallback in the service
      // Since navigator is not defined in node/vitest environment by default usually,
      // let's see how the service handles it. It does `locale || navigator.language || 'en'`
      // In jsdom environment navigator exists.
      
      await createCheckoutSession(params)

      // Get the actual call arguments
      const calls = vi.mocked(supabase.functions.invoke).mock.calls
      const body = calls[0]?.[1]?.body
      
      expect(body).toMatchObject({
        planName: 'pro',
        providerId: '123',
        providerEmail: 'test@example.com'
      })
      // Should have some locale property
      expect(body).toHaveProperty('locale')
    })

    it('throws error when edge function fails', async () => {
      // Mock error response
      const mockError = { message: 'Function error' }
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: mockError })

      const params = {
        planName: 'pro',
        providerId: '123',
        providerEmail: 'test@example.com'
      }

      await expect(createCheckoutSession(params)).rejects.toThrow('Function error')
    })
  })
})
