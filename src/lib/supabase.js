import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create singleton instances
let publicInstance = null
let serviceRoleInstance = null

const createSupabaseClient = (key, options = {}) => {
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: true,
      storageKey: `trailer-locator-auth-${key === supabaseAnonKey ? 'public' : 'service'}`,
      storage: typeof window !== 'undefined' ? window.localStorage : null,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'x-application-name': 'trailer-locator'
      }
    },
    ...options
  })
}

// Get public client (with anon key)
export const supabase = (() => {
  if (!publicInstance) {
    publicInstance = createSupabaseClient(supabaseAnonKey)
  }
  return publicInstance
})()

// Get service role client
export const getServiceSupabase = () => {
  if (!supabaseServiceRoleKey) {
    console.warn('Service role key not available')
    return supabase // fallback to public client
  }
  
  if (!serviceRoleInstance) {
    serviceRoleInstance = createSupabaseClient(supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        flowType: 'implicit'
      }
    })
  }
  
  return serviceRoleInstance
}
