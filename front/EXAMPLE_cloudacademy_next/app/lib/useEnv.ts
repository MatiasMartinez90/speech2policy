import useSWR from 'swr'

interface Env {
  cognitoUserPoolId: string
  cognitoUserPoolWebClientId: string
  cognitoDomain: string
  turnstileSiteKey: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function useEnv() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Always call useSWR, but conditionally use the result
  const { data, error } = useSWR(
    isDevelopment ? null : '/env.json', // Don't fetch in development
    fetcher
  )

  if (isDevelopment) {
    // Development: use environment variables
    const env: Env = {
      cognitoUserPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID || '',
      cognitoUserPoolWebClientId: process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID || '',
      cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
    }

    if (typeof window !== 'undefined') {
      console.log('🔧 [useEnv] Development mode - using env vars:', {
        cognitoUserPoolId: env.cognitoUserPoolId,
        cognitoUserPoolWebClientId: env.cognitoUserPoolWebClientId,
        cognitoDomain: env.cognitoDomain,
        turnstileSiteKey: env.turnstileSiteKey
      })
    }

    return { env: Object.freeze(env) }
  }

  // Production: use fetched data
  if (typeof window !== 'undefined') {
    console.log('🔧 [useEnv] Production mode - fetching from /env.json:', {
      data,
      error,
      loading: !data && !error
    })
  }

  if (error) {
    console.error('❌ [useEnv] Failed to load environment config:', error)
    return { env: null }
  }

  return { env: data || null }
}
