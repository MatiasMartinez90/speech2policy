import '../styles/globals.css'
import '../styles/editor.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
import { Amplify } from 'aws-amplify'
import { Hub } from 'aws-amplify/utils'
import { ResourcesConfig } from 'aws-amplify'
import '@aws-amplify/ui-react/styles.css'
import useEnv from '../lib/useEnv'
import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import * as gtag from '../lib/gtag'

function MyApp({ Component, pageProps }: AppProps) {
  const { env } = useEnv()
  const router = useRouter()
  const amplifyConfigured = useRef(false)

  // Track page views with Google Analytics
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // Listen for auth events
  useEffect(() => {
    if (!env) return // Don't set up listener if no config

    const hubListenerCancel = Hub.listen('auth', (data) => {
      const { payload } = data
      console.log('🔔 [Hub] Auth event:', payload.event)

      switch (payload.event) {
        case 'signedIn':
        case 'signInWithRedirect':
          console.log('✅ [Hub] User signed in successfully')
          window.dispatchEvent(new CustomEvent('amplify-auth-success'))
          break
        case 'signInWithRedirect_failure':
          console.error('❌ [Hub] Sign in failed:', payload.data)
          break
        case 'tokenRefresh':
          console.log('🔄 [Hub] Token refreshed')
          break
      }
    })

    return () => hubListenerCancel()
  }, [env])

  // Memoize redirect URLs to avoid recreation on every render
  const redirectUrls = useMemo(() => {
    if (typeof window === 'undefined') {
      // Server-side: use environment-based defaults
      return {
        signIn: process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000/signin'
          : 'https://proyectos.cloudacademy.ar/signin',
        signOut: process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://proyectos.cloudacademy.ar'
      }
    } else {
      // Client-side: use current origin
      const origin = window.location.origin
      return {
        signIn: `${origin}/signin`,
        signOut: origin
      }
    }
  }, []) // Empty deps - only compute once

  // Memoize Amplify configuration to avoid recreation on every render
  const amplifyConfig = useMemo<ResourcesConfig>(() => {
    if (!env) return {} as ResourcesConfig

    return {
      Auth: {
        Cognito: {
          userPoolId: env.cognitoUserPoolId,
          userPoolClientId: env.cognitoUserPoolWebClientId,
          identityPoolId: undefined, // Not using identity pool
          loginWith: {
            oauth: {
              domain: env.cognitoDomain,
              scopes: ['email', 'openid', 'profile'],
              redirectSignIn: [redirectUrls.signIn],
              redirectSignOut: [redirectUrls.signOut],
              responseType: 'code',
              providers: ['Google']
            }
          }
        }
      }
    }
  }, [env, redirectUrls]) // Memoize based on env and redirectUrls

  // Show loading state if configuration not ready
  if (!env) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0F172A',
        color: 'white',
        fontFamily: 'system-ui'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚙️</div>
          <div>Cargando configuración...</div>
        </div>
      </div>
    )
  }

  // Configure Amplify IMMEDIATELY once we have env (not in useEffect)
  // This ensures Amplify is ready before any components try to use it
  if (!amplifyConfigured.current && amplifyConfig.Auth) {
    try {
      console.log('🔧 [Amplify] Configuring IMMEDIATELY...', {
        userPoolId: env.cognitoUserPoolId,
        clientId: env.cognitoUserPoolWebClientId,
        domain: env.cognitoDomain,
        environment: process.env.NODE_ENV,
        currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'server-side',
        redirectSignIn: amplifyConfig.Auth?.Cognito?.loginWith?.oauth?.redirectSignIn,
        redirectSignOut: amplifyConfig.Auth?.Cognito?.loginWith?.oauth?.redirectSignOut,
      })

      // Configure Amplify with SSR support for Next.js
      Amplify.configure(amplifyConfig, { ssr: true })
      amplifyConfigured.current = true
      console.log('✅ [Amplify] Configuration successful - READY TO USE')
    } catch (error) {
      console.error('❌ [Amplify] Configuration failed:', error)
    }
  }

  return (
    <>
      <Head>
        {/* Primary Meta Tags - Fallback for pages without custom SEO */}
        <title>CloudAcademy - Cursos de AWS, DevOps y Cloud Computing</title>
        <meta name="description" content="Aprende Amazon Web Services (AWS), DevOps y Cloud Computing con proyectos reales. Cursos prácticos de RAG con Bedrock, seguridad, redes y más." />
        <link rel="icon" href="/favicon.ico" />

        {/* Viewport for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

        {/* Additional meta tags */}
        <meta name="format-detection" content="telephone=no" />
      </Head>

      {/* Google Analytics */}
      {gtag.GA_TRACKING_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gtag.GA_TRACKING_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}

      {/* Load Turnstile script - lazyOnload for static export compatibility */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('✅ [Turnstile] Script loaded successfully')
          // Dispatch event to notify components that Turnstile is ready
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('turnstile-loaded'))
          }
        }}
        onError={(e) => {
          console.error('❌ [Turnstile] Script failed to load:', e)
        }}
      />

      <Component {...pageProps} />
    </>
  )
}

export default MyApp

// Export reportWebVitals function for Next.js to track Core Web Vitals
export { reportWebVitals } from '../lib/analytics'
