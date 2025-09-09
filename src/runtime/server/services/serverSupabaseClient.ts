import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { getHeader, type H3Event } from 'h3'
import { fetchWithRetry } from '../../utils/fetch-retry'
import { setCookies } from '../../utils/cookies'
import type { CookieOptions } from '#app'
import { useRuntimeConfig } from '#imports'
// @ts-expect-error - `#supabase/database` is a runtime alias
import type { Database } from '#supabase/database'

export const serverSupabaseClient: <T = Database>(event: H3Event) => Promise<SupabaseClient<T>> = async <T = Database>(event: H3Event) => {
  // No need to recreate client if exists in request context
  if (!event.context._supabaseClient) {
    // get settings from runtime config
    const { url, key, cookiePrefix, cookieOptions, clientOptions: { auth = {}, global = {} } } = useRuntimeConfig(event).public.supabase

    // @ts-expect-error - https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=environment&environment=middleware
    event.context._supabaseClient = createServerClient(url, key, {
      auth,
      cookies: {
        getAll: () => parseCookieHeader(getHeader(event, 'Cookie') ?? ''),
        setAll: (cookies: { name: string, value: string, options: CookieOptions }[]) => setCookies(event, cookies),
      },
      cookieOptions: {
        ...cookieOptions,
        name: cookiePrefix,
      },
      global: {
        fetch: fetchWithRetry,
        ...global,
      },
    })
  }

  return event.context._supabaseClient as SupabaseClient<T>
}
