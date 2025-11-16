import Router from 'next/router'
import { useRef, useEffect } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { authService } from './authService'

/**
 * User fetcher function
 * Uses authService for clean separation of concerns
 */
const fetcher = async () => {
  const user = await authService.getCurrentUser()

  if (!user) {
    throw new Error('User is not authenticated')
  }

  return user
}

/**
 * useUser Hook
 *
 * Manages authentication state with SWR
 * Provides loading, user, and signOut functionality
 *
 * @param options.redirect - Path to redirect if user is not authenticated
 */
export default function useUser({ redirect = '' } = {}) {
  const { cache, mutate: globalMutate } = useSWRConfig()
  const { data: user, error, isValidating, mutate } = useSWR('user', fetcher, {
    // Performance optimizations
    errorRetryCount: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: true,
    dedupingInterval: 30000, // 30 seconds
    refreshInterval: 0,
    shouldRetryOnError: false,
    refreshWhenHidden: false,
    refreshWhenOffline: false
  })

  const hasRedirected = useRef(false)

  // Computed states
  const loading = !user && !error && isValidating
  const loggedOut = !!error && error.message === 'User is not authenticated'

  // DEBUG LOGS
  useEffect(() => {
    console.group('🔍 [useUser] State Check')
    console.log('user:', user ? 'PRESENT' : 'NULL')
    console.log('error:', error)
    console.log('loading:', loading)
    console.log('loggedOut:', loggedOut)
    console.log('isValidating:', isValidating)
    console.log('hasRedirected.current:', hasRedirected.current)
    console.log('redirect param:', redirect)
    console.groupEnd()
  }, [user, error, loading, loggedOut, isValidating, redirect])

  // Listen for auth success events from signin page
  useEffect(() => {
    const handleAuthSuccess = () => {
      console.log('🔔 [useUser] Auth success event, revalidating...')
      mutate()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('amplify-auth-success', handleAuthSuccess)
      return () => window.removeEventListener('amplify-auth-success', handleAuthSuccess)
    }
  }, [mutate])

  // Handle redirect for unauthenticated users
  useEffect(() => {
    console.log('🔄 [useUser] Redirect Effect Check:', {
      loggedOut,
      redirect,
      hasRedirected: hasRedirected.current,
      willRedirect: loggedOut && redirect && !hasRedirected.current
    })

    if (loggedOut && redirect && !hasRedirected.current) {
      console.log('🚪 [useUser] INITIATING REDIRECT to:', redirect)
      console.log('🚪 [useUser] Current path:', Router.asPath)
      hasRedirected.current = true

      // Small delay to prevent flash
      setTimeout(() => {
        console.log('🚪 [useUser] EXECUTING REDIRECT NOW')
        Router.push({ pathname: redirect, query: { redirect: Router.asPath } })
      }, 100)
    }
  }, [loggedOut, redirect])

  // Reset redirect flag when user authenticates
  useEffect(() => {
    if (user && hasRedirected.current) {
      hasRedirected.current = false
    }
  }, [user])

  /**
   * Sign out the current user
   * Uses authService for clean separation of concerns
   *
   * @param options.redirect - Path to redirect after signOut (default: '/')
   */
  const signOut = async ({ redirect = '/' } = {}) => {
    console.log('🚪 [useUser] Initiating signOut...')

    try {
      // Step 1: Optimistically clear SWR cache
      cache.delete('user')
      mutate(undefined, { revalidate: false })

      // Step 2: Execute auth service signOut (returns cleanup function)
      const cleanup = await authService.signOut()

      // Step 3: Navigate using window.location for hard reload
      // This ensures complete state reset
      if (typeof window !== 'undefined') {
        // Execute cleanup before navigation
        cleanup()

        // Hard navigation to clear all in-memory state
        window.location.href = redirect
      }

    } catch (error) {
      console.error('❌ [useUser] SignOut error:', error)

      // Fallback: ensure cleanup and navigation even on error
      cache.delete('user')
      mutate(undefined, { revalidate: false })

      if (typeof window !== 'undefined') {
        window.location.href = redirect
      }
    }
  }

  return {
    loading,
    loggedOut,
    user,
    signOut,
    isAuthenticating: isValidating && !user
  }
}
