import { NextPage } from 'next'
import { useEffect, useState, useCallback } from 'react'
import { signInWithRedirect, getCurrentUser, signIn, signUp, confirmSignUp } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import useEnv from '../lib/useEnv'

// Hub listener outside of component to avoid useEffect issues
let hubUnsubscribe: (() => void) | null = null

type AuthMode = 'signin' | 'signup' | 'confirm'

// Declare Turnstile types globally
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string
        callback?: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'compact'
      }) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SignIn: NextPage = () => {
  const { env } = useEnv()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')

  // Email/Password form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)

  const getUser = useCallback(async () => {
    try {
      console.log('🔍 [SignIn] Checking current user...')
      console.log('🔍 [SignIn] Current URL during check:', window.location.href)

      const currentUser = await getCurrentUser()
      console.log('✅ [SignIn] User found:', {
        username: currentUser.username,
        userId: currentUser.userId,
        signInDetails: currentUser.signInDetails
      })

      const clientId = process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID || 'fallback-client-id'
      const cognitoKeys = Object.keys(localStorage).filter(key => key.includes('CognitoIdentityServiceProvider'))
      console.log('🔍 [SignIn] Cognito localStorage keys found:', cognitoKeys)

      setUser(currentUser)
      setLoading(false)

      setTimeout(() => {
        console.log('🚀 [SignIn] Redirecting to /courses...')
        window.location.href = '/courses'
      }, 1000)

    } catch (error) {
      console.log('👤 [SignIn] No user signed in:', {
        error: error instanceof Error ? error.message : String(error),
        currentURL: window.location.href,
        hasCode: window.location.search.includes('code=')
      })
      setLoading(false)
    }
  }, [])

  // Hub event handler
  const handleHubEvent = useCallback(({ payload }: any) => {
    console.log('🔔 [SignIn] Hub auth event received:', {
      event: payload.event,
      data: payload.data,
      timestamp: new Date().toISOString()
    })

    switch (payload.event) {
      case "signInWithRedirect":
        console.log('✅ [SignIn] OAuth redirect successful, getting user...')
        getUser()
        break
      case "signInWithRedirect_failure":
        console.error('❌ [SignIn] OAuth redirect failed:', payload.data)
        setError("Error en el proceso de autenticación con Google")
        setLoading(false)
        break
      case "customOAuthState":
        console.log('🔔 [SignIn] Custom OAuth state:', payload.data)
        break
      case "signedIn":
        console.log('✅ [SignIn] User signed in via Hub event, getting user...')
        getUser()
        break
      default:
        console.log('🔔 [SignIn] Other auth event:', payload.event)
    }
  }, [getUser])

  // Listen for Turnstile script load event
  useEffect(() => {
    const handleTurnstileLoad = () => {
      console.log('🎯 [Turnstile] Load event received')
      setTurnstileReady(true)
    }

    // Check if already loaded
    if (typeof window !== 'undefined' && window.turnstile) {
      console.log('🎯 [Turnstile] Already loaded')
      setTurnstileReady(true)
    }

    window.addEventListener('turnstile-loaded', handleTurnstileLoad)
    return () => window.removeEventListener('turnstile-loaded', handleTurnstileLoad)
  }, [])

  // Render Turnstile widget when ready
  useEffect(() => {
    // Prerequisites check
    if (!turnstileReady) {
      console.log('⏳ [Turnstile] Script not ready yet')
      return
    }

    if (!env?.turnstileSiteKey) {
      console.log('⏳ [Turnstile] Waiting for sitekey from env')
      return
    }

    if (!window.turnstile) {
      console.error('❌ [Turnstile] window.turnstile not available despite ready state')
      return
    }

    // Find container
    const containerId = authMode === 'signin' ? 'turnstile-container-signin' : 'turnstile-container-signup'
    const container = document.getElementById(containerId)

    if (!container) {
      console.log(`⏳ [Turnstile] Container #${containerId} not found yet`)
      // Retry after a short delay to handle async rendering
      const retryTimer = setTimeout(() => {
        const retryContainer = document.getElementById(containerId)
        if (retryContainer && !turnstileWidgetId) {
          console.log(`🔄 [Turnstile] Retry: Container found, rendering...`)
          renderWidget(retryContainer)
        }
      }, 100)
      return () => clearTimeout(retryTimer)
    }

    // Check if widget already exists in this container
    if (container.children.length > 0) {
      console.log('✅ [Turnstile] Widget already rendered in container')
      return
    }

    // Render widget
    renderWidget(container)

    function renderWidget(container: HTMLElement) {
      try {
        console.log(`🔧 [Turnstile] Rendering widget in #${containerId}`)
        console.log(`🔧 [Turnstile] Using sitekey: ${env!.turnstileSiteKey}`)

        const widgetId = window.turnstile!.render(container, {
          sitekey: env!.turnstileSiteKey,
          theme: 'light',
          callback: (token: string) => {
            console.log('✅ [Turnstile] Verification successful')
            setTurnstileToken(token)
          },
          'error-callback': () => {
            console.error('❌ [Turnstile] Verification error')
            setTurnstileToken(null)
          },
          'expired-callback': () => {
            console.log('⚠️ [Turnstile] Token expired')
            setTurnstileToken(null)
          }
        })

        setTurnstileWidgetId(widgetId)
        console.log(`✅ [Turnstile] Widget rendered successfully with ID: ${widgetId}`)
      } catch (error) {
        console.error('❌ [Turnstile] Failed to render widget:', error)
      }
    }
  }, [turnstileReady, env?.turnstileSiteKey, authMode])

  // Reset widget state when switching modes (BEFORE cleanup)
  useEffect(() => {
    console.log(`🔄 [Turnstile] Auth mode changed to: ${authMode}`)

    // Cleanup previous widget if exists
    if (turnstileWidgetId && window.turnstile) {
      console.log(`🧹 [Turnstile] Cleaning up widget ${turnstileWidgetId}`)
      try {
        window.turnstile.remove(turnstileWidgetId)
      } catch (error) {
        console.error('❌ [Turnstile] Error during cleanup:', error)
      }
    }

    // Reset state to allow re-render
    setTurnstileWidgetId(null)
    setTurnstileToken(null)
  }, [authMode])

  // Setup Hub listener and check for OAuth callback
  useEffect(() => {
    console.log('🔧 [SignIn] Setting up Hub listener for auth events...')
    console.log('🔍 [SignIn] Current URL on load:', window.location.href)

    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')
    const errorDescription = urlParams.get('error_description')

    if (code || state || error) {
      console.log('🔔 [SignIn] OAuth callback detected:', {
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        error: error,
        errorDescription: errorDescription,
        fullURL: window.location.href
      })
    }

    if (hubUnsubscribe) {
      hubUnsubscribe()
    }

    hubUnsubscribe = Hub.listen("auth", handleHubEvent)
    console.log('🔍 [SignIn] Hub listener configured')

    getUser()

    if (code) {
      console.log('🔄 [SignIn] OAuth callback with code detected, processing...')

      setTimeout(() => {
        console.log('🔄 [SignIn] First timeout: checking user...')
        getUser()
      }, 1000)

      setTimeout(() => {
        console.log('🔄 [SignIn] Second timeout: checking user again...')
        getUser()
      }, 3000)

      setTimeout(() => {
        console.log('🔄 [SignIn] Third timeout: checking user final time...')
        getUser()
      }, 5000)
    }

    return () => {
      if (hubUnsubscribe) {
        hubUnsubscribe()
        hubUnsubscribe = null
      }
    }
  }, [handleHubEvent, getUser])

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 [SignIn] Starting Google OAuth with signInWithRedirect...')
      console.log('🔍 [SignIn] Current URL before OAuth:', window.location.href)

      const result = await signInWithRedirect({ provider: 'Google' })
      console.log('✅ [SignIn] signInWithRedirect result:', result)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ [SignIn] signInWithRedirect failed:', {
        message: errorMessage,
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
      setError(`Error al iniciar sesión con Google: ${errorMessage}`)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate Turnstile token
      if (!turnstileToken) {
        setError('Por favor completa la verificación de seguridad')
        setLoading(false)
        return
      }

      console.log('🔍 [SignIn] Starting email/password sign in...')

      const result = await signIn({
        username: email,
        password: password
      })

      console.log('✅ [SignIn] Email sign in successful:', result)

      // Redirect to courses
      setTimeout(() => {
        window.location.href = '/courses'
      }, 500)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ [SignIn] Email sign in failed:', errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate Turnstile token
      if (!turnstileToken) {
        setError('Por favor completa la verificación de seguridad')
        setLoading(false)
        return
      }

      console.log('🔍 [SignIn] Starting email/password sign up...')

      const result = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            name: fullName
          }
        }
      })

      console.log('✅ [SignIn] Sign up successful, awaiting confirmation:', result)

      // Switch to confirmation mode
      setAuthMode('confirm')
      setLoading(false)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ [SignIn] Sign up failed:', errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('🔍 [SignIn] Confirming sign up with code...')

      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode
      })

      console.log('✅ [SignIn] Confirmation successful')

      // Auto sign in after confirmation
      const result = await signIn({
        username: email,
        password: password
      })

      console.log('✅ [SignIn] Auto sign in successful:', result)

      // Redirect to courses
      setTimeout(() => {
        window.location.href = '/courses'
      }, 500)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ [SignIn] Confirmation failed:', errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (loading && !error && authMode === 'signin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Show success message if user is authenticated
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario autenticado. Redirigiendo...</p>
          <p className="text-xs text-gray-400 mt-2">Usuario: {user.username}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and title */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-indigo-600">CloudAcademy</span>
              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded uppercase font-bold">PROYECTS</span>
            </div>
            <p className="text-gray-600 text-lg">
              {authMode === 'confirm'
                ? 'Ingresa el código que te enviamos por email'
                : 'Inicia sesión para acceder a tus proyectos'}
            </p>
          </div>

          {authMode === 'confirm' ? (
            /* Confirmation Code Form */
            <form onSubmit={handleConfirmSignUp} className="mt-8 space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de verificación
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="123456"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Revisa tu email: {email}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Verificando...' : 'Confirmar cuenta'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup')
                  setError(null)
                  setConfirmationCode('')
                }}
                className="w-full text-sm text-indigo-600 hover:text-indigo-500"
              >
                Volver al registro
              </button>
            </form>
          ) : (
            <>
              {/* Google Sign In Button - PROMINENT */}
              <div className="mt-8">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm font-medium transition-all"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>
              </div>

              {/* Separator */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">o</span>
                </div>
              </div>

              {/* Tabs for Email/Password */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => {
                      setAuthMode('signin')
                      setError(null)
                    }}
                    className={`${
                      authMode === 'signin'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup')
                      setError(null)
                    }}
                    className={`${
                      authMode === 'signup'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Registrarse
                  </button>
                </nav>
              </div>

              {/* Sign In Form */}
              {authMode === 'signin' && (
                <form onSubmit={handleEmailSignIn} className="mt-8 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email-signin" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        id="email-signin"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="password-signin" className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña
                      </label>
                      <input
                        id="password-signin"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </button>

                  {/* Turnstile Widget - Below submit button */}
                  <div className="flex justify-center">
                    <div id="turnstile-container-signin"></div>
                  </div>
                </form>
              )}

              {/* Sign Up Form */}
              {authMode === 'signup' && (
                <form onSubmit={handleEmailSignUp} className="mt-8 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Completo
                      </label>
                      <input
                        id="fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        id="email-signup"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña
                      </label>
                      <input
                        id="password-signup"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Mínimo 8 caracteres"
                        minLength={8}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Mínimo 8 caracteres
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </button>

                  {/* Turnstile Widget - Below submit button */}
                  <div className="flex justify-center">
                    <div id="turnstile-container-signup"></div>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Al registrarte, aceptas nuestros Términos de Servicio y Política de Privacidad
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right side - Video */}
      <div className="hidden lg:flex lg:flex-1 bg-white p-8 items-center justify-center">
        <div className="w-full h-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/signin-poster.jpg"
            className="w-full h-full object-cover"
          >
            <source src="/signin-video.mp4" type="video/mp4" />
            Tu navegador no soporta el tag de video.
          </video>
        </div>
      </div>
    </div>
  )
}

export default SignIn
