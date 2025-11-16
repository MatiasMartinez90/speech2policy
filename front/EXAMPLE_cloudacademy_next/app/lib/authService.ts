/**
 * Authentication Service
 *
 * Clean separation of concerns for authentication operations.
 * Handles all auth-related side effects in a predictable way.
 */

import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth'

/**
 * Storage Service - Handles localStorage operations
 */
class StorageService {
  private readonly CLIENT_ID_KEY = 'NEXT_PUBLIC_AUTH_WEB_CLIENT_ID'

  private getClientId(): string {
    return process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID || 'fallback-client-id'
  }

  private getCognitoKeyPrefix(): string {
    return `CognitoIdentityServiceProvider.${this.getClientId()}`
  }

  /**
   * Clear all Cognito-related data from localStorage
   */
  clearCognitoStorage(): void {
    if (typeof window === 'undefined') return

    const prefix = this.getCognitoKeyPrefix()
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.startsWith('CognitoIdentityServiceProvider')
    )

    keysToRemove.forEach(key => localStorage.removeItem(key))

    console.log(`🧹 [StorageService] Cleared ${keysToRemove.length} Cognito keys`)
  }

  /**
   * Check if user tokens exist in localStorage
   */
  hasValidTokens(): boolean {
    if (typeof window === 'undefined') return false

    const clientId = this.getClientId()
    const lastAuthUser = localStorage.getItem(`${this.getCognitoKeyPrefix()}.LastAuthUser`)

    if (!lastAuthUser) return false

    const idTokenKey = `${this.getCognitoKeyPrefix()}.${lastAuthUser}.idToken`
    const idToken = localStorage.getItem(idTokenKey)

    if (!idToken) return false

    try {
      // Check token expiration
      const payload = JSON.parse(atob(idToken.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp > currentTime
    } catch {
      return false
    }
  }

  /**
   * Extract user info from localStorage tokens
   */
  getUserFromStorage(): any | null {
    if (typeof window === 'undefined') return null

    try {
      const clientId = this.getClientId()
      const prefix = this.getCognitoKeyPrefix()
      console.log('🔑 [StorageService] Looking for user with:', { clientId, prefix })

      const lastAuthUser = localStorage.getItem(`${prefix}.LastAuthUser`)
      console.log('👤 [StorageService] LastAuthUser:', lastAuthUser)

      if (!lastAuthUser) {
        console.log('❌ [StorageService] No LastAuthUser found in localStorage')
        return null
      }

      const idTokenKey = `${prefix}.${lastAuthUser}.idToken`
      const idToken = localStorage.getItem(idTokenKey)
      console.log('🎫 [StorageService] ID Token:', idToken ? 'FOUND' : 'NOT FOUND')

      if (!idToken) {
        console.log('❌ [StorageService] No idToken found for user:', lastAuthUser)
        return null
      }

      const payload = JSON.parse(atob(idToken.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)

      if (payload.exp < currentTime) {
        this.clearCognitoStorage()
        return null
      }

      return {
        username: payload.username || payload.sub,
        userId: payload.sub,
        email: payload.email,
        name: payload.name || payload.given_name || payload.email?.split('@')[0],
        picture: payload.picture,
        signInDetails: {
          loginId: payload.email || payload.username || payload.sub
        }
      }
    } catch (error) {
      console.error('❌ [StorageService] Error extracting user:', error)
      return null
    }
  }
}

/**
 * Auth Service - Handles authentication operations
 */
class AuthService {
  private storage = new StorageService()

  /**
   * Get current authenticated user
   * Uses optimistic UI pattern: show cached data immediately, validate in background
   */
  async getCurrentUser(): Promise<any | null> {
    console.log('🔍 [AuthService] getCurrentUser() called')

    try {
      // Strategy 1: Get cached user from localStorage (instant, optimistic)
      const cachedUser = this.storage.getUserFromStorage()
      console.log('📦 [AuthService] Cached user from storage:', cachedUser ? 'PRESENT' : 'NULL')
      if (cachedUser) {
        console.log('   User details:', {
          email: cachedUser.email,
          userId: cachedUser.userId,
          name: cachedUser.name
        })
      }

      // Strategy 2: Get actual user from Amplify (source of truth)
      let amplifyUser = null
      let enrichedUser = null

      try {
        console.log('🔄 [AuthService] Calling Amplify getCurrentUser()...')
        amplifyUser = await getCurrentUser()
        console.log('✅ [AuthService] User authenticated via Amplify:', amplifyUser)

        // Strategy 3: Enrich with session tokens if available
        try {
          const session = await fetchAuthSession()
          if (session.tokens?.idToken) {
            const payload = JSON.parse(atob(session.tokens.idToken.toString().split('.')[1]))
            enrichedUser = {
              username: amplifyUser.username,
              userId: amplifyUser.userId,
              email: payload.email,
              name: payload.name,
              picture: payload.picture,
              signInDetails: {
                loginId: payload.email || amplifyUser.username
              }
            }
          }
        } catch (sessionError) {
          console.log('⚠️ [AuthService] No session tokens, using basic user')
          enrichedUser = amplifyUser
        }
      } catch (amplifyError) {
        console.error('❌ [AuthService] Amplify getCurrentUser() failed:', amplifyError)
        console.log('👤 [AuthService] No authenticated user in Amplify')

        // If Amplify has no user, cache should also be invalid
        if (cachedUser) {
          console.log('🧹 [AuthService] Clearing stale cache - no Amplify session')
          this.storage.clearCognitoStorage()
        }
        return null
      }

      // Validation: Compare cached user with Amplify user
      if (cachedUser && enrichedUser) {
        // Check if cached user matches current Amplify user
        const cachedUserId = cachedUser.userId || (cachedUser as any).sub
        const amplifyUserId = enrichedUser.userId

        if (cachedUserId !== amplifyUserId) {
          console.log('⚠️ [AuthService] Cache mismatch detected!')
          console.log('   Cached user:', (cachedUser as any).email, '(ID:', cachedUserId, ')')
          console.log('   Amplify user:', (enrichedUser as any).email, '(ID:', amplifyUserId, ')')
          console.log('🧹 [AuthService] Clearing corrupted cache')
          this.storage.clearCognitoStorage()
        } else {
          console.log('✅ [AuthService] Cache validated - user identity matches')
        }
      }

      // Return the enriched Amplify user (source of truth)
      return enrichedUser

    } catch (error) {
      console.error('❌ [AuthService] Error getting current user:', error)
      return null
    }
  }

  /**
   * Sign out user with proper cleanup
   * Returns a cleanup function that should be called after navigation
   */
  async signOut(): Promise<() => void> {
    console.log('🚪 [AuthService] Starting signOut...')

    try {
      // Step 1: Call Amplify signOut
      await amplifySignOut({ global: true })
      console.log('✅ [AuthService] Amplify signOut successful')
    } catch (error) {
      console.error('❌ [AuthService] Amplify signOut failed:', error)
      // Continue with cleanup even if Amplify fails
    }

    // Step 2: Return cleanup function
    return () => {
      this.storage.clearCognitoStorage()
      console.log('✅ [AuthService] Post-signOut cleanup complete')
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user !== null
  }
}

// Export singleton instance
export const authService = new AuthService()

// Export types
export type { StorageService }
