# Comparación CloudAcademy vs Agent - Análisis de Autenticación

**Fecha de análisis:** 26 de Octubre, 2025
**Analista:** Claude Code
**Objetivo:** Identificar diferencias en la implementación de autenticación con AWS Cognito y migrar mejoras de "agent" a "cloudacademy"

---

## Resumen Ejecutivo

El proyecto **agent** tiene una implementación de autenticación significativamente más robusta y actualizada que **cloudacademy**. Las diferencias principales incluyen:

1. **Versiones de librerías:** Agent usa AWS Amplify v6 mientras CloudAcademy usa v4 (cambio MAYOR de API)
2. **Manejo de OAuth:** Agent tiene procesamiento manual de callbacks con reintentos, CloudAcademy confía en componentes automáticos
3. **Prevención de bugs:** Agent tiene múltiples mecanismos anti-redirect-loops y manejo de errores
4. **SSR Support:** Agent configurado para Server-Side Rendering, CloudAcademy no
5. **Event synchronization:** Agent usa Hub events para sincronización de estado de autenticación

**Recomendación:** Migrar la implementación de agent a cloudacademy completamente.

---

## 1. Diferencias en Dependencias

### CloudAcademy (app/package.json)
```json
{
  "aws-amplify": "^4.3.14",
  "@aws-amplify/ui-react": "^2.6.1",
  "next": "12.1.0",
  "react": "17.0.2",
  "react-dom": "17.0.2"
}
```

### Agent (app/package.json)
```json
{
  "aws-amplify": "^6.15.5",                    // +2 versiones MAJOR
  "@aws-amplify/ui-react": "^6.11.2",          // +4 versiones MAJOR
  "@aws-amplify/adapter-nextjs": "^1.6.8",     // NUEVO paquete
  "next": "^13.5.6",                           // +1 versión MAJOR
  "react": "^18.2.0",                          // +1 versión MAJOR
  "react-dom": "^18.2.0"
}
```

### Impacto
- **CRÍTICO:** Amplify v6 tiene una API completamente diferente a v4
- Los imports cambian de `aws-amplify` a `aws-amplify/auth`, `aws-amplify/utils`
- Configuración de Amplify cambia de objeto plano a `ResourcesConfig` con estructura anidada
- Métodos de autenticación cambian: `Auth.currentAuthenticatedUser()` → `getCurrentUser()`

---

## 2. Configuración de Amplify (_app.tsx)

### CloudAcademy - Amplify v4 API
```typescript
// pages/_app.tsx:12-28
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: env.cognitoUserPoolId,
    userPoolWebClientId: env.cognitoUserPoolWebClientId,
    oauth: {
      domain: env.cognitoDomain,
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: typeof window !== 'undefined' ? window.location.origin + '/admin' : 'http://localhost:3000/admin',
      redirectSignOut: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      responseType: 'code',
      options: {
        AdvancedSecurityDataCollectionFlag: false,
      },
    },
  },
})
```

**Problemas:**
1. ❌ No tiene Hub listener para eventos de autenticación
2. ❌ Redirect hardcodeado a `/admin` (no flexible)
3. ❌ Sin soporte SSR
4. ❌ Sin logging para debugging
5. ❌ Loading state muy simple

### Agent - Amplify v6 API
```typescript
// pages/_app.tsx:19-43 - Hub Event Listener
useEffect(() => {
  if (!env) return

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

// pages/_app.tsx:66-107 - Configuración v6
const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: env.cognitoUserPoolId,
      userPoolClientId: env.cognitoUserPoolWebClientId,
      identityPoolId: undefined,
      loginWith: {
        oauth: {
          domain: env.cognitoDomain,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [redirectUrls.signIn],      // Dinámico
          redirectSignOut: [redirectUrls.signOut],    // Dinámico
          responseType: 'code',
          providers: ['Google']
        }
      }
    }
  }
}

// pages/_app.tsx:123
Amplify.configure(amplifyConfig, { ssr: true })  // SSR enabled!
```

**Ventajas:**
1. ✅ Hub listener activo para todos los eventos de autenticación
2. ✅ Custom event `amplify-auth-success` para sincronización cross-component
3. ✅ Redirects dinámicos según environment (dev/prod)
4. ✅ SSR support habilitado
5. ✅ Logging extensivo para debugging
6. ✅ Loading state visual con spinner

---

## 3. Hook de Autenticación (useUser.ts)

### CloudAcademy - Simple pero frágil
```typescript
// lib/useUser.ts:5-7
const fetcher = async () => {
  return Auth.currentAuthenticatedUser()
}

// lib/useUser.ts:9-27
export default function useUser({ redirect = '' } = {}) {
  const { cache } = useSWRConfig()
  const { data: user, error } = useSWR('user', fetcher)

  const loading = !user && !error
  const loggedOut = error && error === 'The user is not authenticated'

  if (loggedOut && redirect) {
    Router.push({ pathname: redirect, query: { redirect: Router.asPath } })
  }

  const signOut = async ({ redirect = '/' }) => {
    cache.delete('user')
    await Router.push(redirect)
    await Auth.signOut()
  }

  return { loading, loggedOut, user, signOut }
}
```

**Problemas:**
1. ❌ **Redirect en body del componente** → puede causar loops infinitos
2. ❌ Sin configuración de SWR → puede revalidar demasiado
3. ❌ No maneja localStorage → pierde datos en refreshes
4. ❌ No verifica expiración de tokens
5. ❌ Sin logging para debugging
6. ❌ No escucha eventos de auth

### Agent - Robusto y con fallbacks
```typescript
// lib/useUser.ts:6-64 - Extracción manual de localStorage
const extractUserFromLocalStorage = () => {
  if (typeof window === 'undefined') return null

  try {
    const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID || '2sfsss72kin03gbilraa1pvlb5'
    const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`)

    if (!lastAuthUser) {
      // Quick cleanup of old tokens
      const allKeys = Object.keys(localStorage).filter(key => key.includes('Cognito'))
      const obsoleteKeys = allKeys.filter(key => key.includes('2sfsss72kin03gbilraa1pvlb5'))
      obsoleteKeys.forEach(key => localStorage.removeItem(key))
      return null
    }

    const idTokenKey = `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`
    const idToken = localStorage.getItem(idTokenKey)

    if (!idToken) return null

    // Parse ID token payload
    const payload = JSON.parse(atob(idToken.split('.')[1]))
    const currentTime = Math.floor(Date.now() / 1000)

    // Check if token is expired
    if (payload.exp < currentTime) {
      // Cleanup expired tokens
      localStorage.removeItem(idTokenKey)
      localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`)
      localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.userData`)
      localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`)
      return null
    }

    // Create user object with Google OAuth data
    return {
      username: payload.username || payload.sub,
      userId: payload.sub,
      signInDetails: { loginId: payload.email || payload.username || payload.sub },
      email: payload.email,
      name: payload.name || payload.given_name || ...,
      picture: payload.picture,
      google_name: payload.name,
      google_picture: payload.picture,
      google_email: payload.email,
      tokenExp: payload.exp,
      tokenIat: payload.iat
    }
  } catch (error) {
    console.error('Error extracting user from localStorage:', error)
    return null
  }
}

// lib/useUser.ts:66-143 - Fetcher con múltiples estrategias
const fetcher = async () => {
  try {
    // Strategy 1: Try localStorage first (fastest)
    const localUser = extractUserFromLocalStorage()
    if (localUser) {
      console.log('✅ [fetcher] Found user in localStorage:', localUser.email)
      return localUser
    }

    // Strategy 2: Try Amplify getCurrentUser
    const user = await getCurrentUser()

    // Strategy 3: Try to get session with tokens
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken

    if (idToken) {
      const payload = JSON.parse(atob(idToken.toString().split('.')[1]))
      return {
        ...user,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        // ... más datos de Google OAuth
      }
    }

    return user
  } catch (error) {
    throw new Error('User is not authenticated')
  }
}

// lib/useUser.ts:145-157 - SWR con configuración optimizada
const { data: user, error, isValidating, mutate } = useSWR('user', fetcher, {
  errorRetryCount: 0,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateOnMount: true,
  dedupingInterval: 30000,        // Cache por 30 segundos
  refreshInterval: 0,
  shouldRetryOnError: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false
})

// lib/useUser.ts:159-172 - Event listener para auth success
useEffect(() => {
  const handleAuthSuccess = () => {
    console.log('🔔 [useUser] Auth success event received, revalidating...')
    mutate() // Force revalidation
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('amplify-auth-success', handleAuthSuccess)
    return () => {
      window.removeEventListener('amplify-auth-success', handleAuthSuccess)
    }
  }
}, [mutate])

// lib/useUser.ts:173-197 - Redirect con protección anti-loop
const hasRedirected = useRef(false)

useEffect(() => {
  if (loggedOut && redirect && !hasRedirected.current) {
    console.log('🚪 [useUser] Redirecting unauthenticated user')
    hasRedirected.current = true
    setTimeout(() => {
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

// lib/useUser.ts:206-226 - SignOut mejorado
const signOut = async ({ redirect = '/' }) => {
  try {
    console.log('🚪 [useUser] Starting signOut process...')

    cache.delete('user')

    // Call Amplify signOut with global parameter for OAuth
    await amplifySignOut({ global: true })
    console.log('✅ [useUser] Amplify signOut successful')

    await Router.push(redirect)

  } catch (error) {
    console.error('❌ [useUser] SignOut error:', error)
    await Router.push(redirect)  // Try to redirect anyway
  }
}
```

**Ventajas:**
1. ✅ **Fallback a localStorage** → datos disponibles incluso si Amplify falla
2. ✅ **Verificación de expiración** → limpia tokens vencidos automáticamente
3. ✅ **SWR optimizado** → no revalida innecesariamente
4. ✅ **Prevención de redirect loops** → usa useRef y useEffect
5. ✅ **Event listener** → responde a eventos de autenticación
6. ✅ **Enriquecimiento de datos** → extrae info de Google OAuth del token
7. ✅ **Logging extensivo** → debugging fácil
8. ✅ **Performance tracking** → mide tiempo de carga
9. ✅ **Global signOut** → cierra sesión en Cognito correctamente

---

## 4. Página de Sign In (signin.tsx)

### CloudAcademy - Componente Authenticator
```typescript
// pages/signin.tsx:25-34
const AuthUI: NextPage = () => {
  const { route } = useAuthenticator((context) => [context.route])
  const { cache } = useSWRConfig()

  if (route === 'authenticated') {
    cache.delete('user')
    const redirect = Router.query.redirect || '/'
    Router.push(redirect + '')
    return <>Redirect...</>
  }

  return (
    <Authenticator
      socialProviders={['google']}
      loginMechanisms={['email']}
      // ... UI components
    />
  )
}
```

**Características:**
- 🟡 Usa componente `<Authenticator>` de Amplify UI React v2
- 🟡 Manejo automático de OAuth callback
- ❌ Sin control sobre el proceso de autenticación
- ❌ Sin logging de errores
- ❌ No detecta problemas de redirect

### Agent - Implementación Manual
```typescript
// pages/signin.tsx:7-8 - Hub listener global
let hubUnsubscribe: (() => void) | null = null

// pages/signin.tsx:14-48 - Verificación de usuario
const getUser = useCallback(async () => {
  try {
    console.log('🔍 [SignIn] Checking current user...')
    console.log('🔍 [SignIn] Current URL during check:', window.location.href)

    const currentUser = await getCurrentUser()
    console.log('✅ [SignIn] User found:', currentUser.username)

    setUser(currentUser)
    setLoading(false)

    // Redirect after successful login
    setTimeout(() => {
      console.log('🚀 [SignIn] Redirecting to /admin...')
      window.location.href = '/admin'
    }, 1000)

  } catch (error) {
    console.log('👤 [SignIn] No user signed in')
    setLoading(false)
  }
}, [])

// pages/signin.tsx:50-78 - Hub event handler
const handleHubEvent = useCallback(({ payload }: any) => {
  console.log('🔔 [SignIn] Hub auth event received:', payload.event)

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
    case "signedIn":
      console.log('✅ [SignIn] User signed in via Hub event')
      getUser()
      break
  }
}, [getUser])

// pages/signin.tsx:81-144 - Setup y detección de OAuth callback
useEffect(() => {
  console.log('🔧 [SignIn] Setting up Hub listener for auth events...')

  // Check for OAuth callback parameters
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')

  if (code || state) {
    console.log('🔔 [SignIn] OAuth callback detected:', {
      hasCode: !!code,
      hasState: !!state,
      fullURL: window.location.href
    })
  }

  // Clean up previous listener
  if (hubUnsubscribe) {
    hubUnsubscribe()
  }

  // Set up new Hub listener
  hubUnsubscribe = Hub.listen("auth", handleHubEvent)

  // Check if user is already signed in
  getUser()

  // If we have OAuth callback, try multiple times
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

// pages/signin.tsx:146-168 - Google Sign In
const handleGoogleSignIn = async () => {
  try {
    console.log('🔍 [SignIn] Starting Google OAuth with signInWithRedirect...')

    const result = await signInWithRedirect({ provider: 'Google' })
    console.log('✅ [SignIn] signInWithRedirect result:', result)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ [SignIn] signInWithRedirect failed:', errorMessage)
    setError(`Error al iniciar sesión con Google: ${errorMessage}`)
  }
}
```

**Ventajas:**
1. ✅ **Control total** sobre el proceso de OAuth
2. ✅ **Detección de callback** → detecta parámetros `code` y `state` en URL
3. ✅ **Múltiples reintentos** → verifica autenticación a 1s, 3s, 5s después del callback
4. ✅ **Hub events** → escucha todos los eventos de Amplify
5. ✅ **Error handling** → captura y muestra errores
6. ✅ **Logging extensivo** → debugging completo del flujo OAuth
7. ✅ **Botón de test** → permite probar OAuth directo vs signInWithRedirect
8. ✅ **Estados separados** → loading, user, error manejados independientemente

**¿Por qué múltiples setTimeout?**
- Amplify v6 procesa el callback de OAuth de forma asíncrona
- No hay un evento confiable que indique "callback procesado completamente"
- Los reintentos aseguran que capturamos el user cuando esté listo
- Esto resuelve el bug de "página en blanco después de OAuth redirect"

---

## 5. Next.js Configuration (next.config.ts)

### CloudAcademy
```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true
}
```

### Agent
```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true  // Para export estático
  }
}
```

**Diferencia:** Agent tiene `images.unoptimized: true` para soportar `next export`.

---

## 6. Environment Configuration (useEnv.ts)

### CloudAcademy
```typescript
export default function useEnv() {
  const { data: env } = useSWR<Env>(dev ? null : '/env.json', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  if (dev) {
    return {
      env: Object.freeze({
        cognitoUserPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
        cognitoUserPoolWebClientId: process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID,
        cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      }) as Env,
    }
  }

  return { env: Object.freeze(env) }
}
```

### Agent
```typescript
export default function useEnv() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const { data, error } = useSWR(
    isDevelopment ? null : '/env.json',
    fetcher
  )

  if (isDevelopment) {
    const env: Env = {
      cognitoUserPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID || 'us-east-1_MeClCiUAC',
      cognitoUserPoolWebClientId: process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID || '2sfsss72kin03gbilraa1pvlb5',
      cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'agent-auth-2sc4m5q6.auth.us-east-1.amazoncognito.com',
    }

    console.log('🔧 [useEnv] Development mode - using env vars:', env)
    return { env: Object.freeze(env) }
  }

  console.log('🔧 [useEnv] Production mode - fetching from /env.json')

  if (error) {
    console.error('Failed to load environment config:', error)
    return { env: null }
  }

  return { env: data || null }
}
```

**Ventajas de Agent:**
1. ✅ Fallbacks hardcodeados → funciona aunque falten variables de entorno
2. ✅ Logging → debugging de configuración
3. ✅ Error handling → manejo de fallo en fetch de /env.json

---

## 7. Bugs Resueltos en Agent

### 🐛 Bug #1: Redirect Loop Infinito
**Problema en CloudAcademy:**
```typescript
// En useUser.ts, el redirect está en el body del componente:
if (loggedOut && redirect) {
  Router.push({ pathname: redirect, query: { redirect: Router.asPath } })
}
```
- Se ejecuta en cada render
- Puede causar loops infinitos si la página de destino también usa useUser

**Solución en Agent:**
```typescript
const hasRedirected = useRef(false)

useEffect(() => {
  if (loggedOut && redirect && !hasRedirected.current) {
    hasRedirected.current = true
    setTimeout(() => {
      Router.push({ pathname: redirect, query: { redirect: Router.asPath } })
    }, 100)
  }
}, [loggedOut, redirect])

useEffect(() => {
  if (user && hasRedirected.current) {
    hasRedirected.current = false
  }
}, [user])
```

### 🐛 Bug #2: OAuth Callback No Procesado
**Problema en CloudAcademy:**
- Confía en que el Authenticator component procese el callback
- Si el componente falla o tarda, el usuario queda en una página en blanco

**Solución en Agent:**
```typescript
// Detección explícita de callback
const code = urlParams.get('code')

if (code) {
  // Múltiples intentos de verificación
  setTimeout(() => getUser(), 1000)
  setTimeout(() => getUser(), 3000)
  setTimeout(() => getUser(), 5000)
}
```

### 🐛 Bug #3: Datos de Usuario Perdidos en Refresh
**Problema en CloudAcademy:**
- Solo confía en `Auth.currentAuthenticatedUser()`
- Si Amplify no está inicializado correctamente, pierde el usuario

**Solución en Agent:**
```typescript
const extractUserFromLocalStorage = () => {
  // Lee directamente de localStorage
  const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID
  const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`)
  const idToken = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`)

  // Parsea el token y verifica expiración
  const payload = JSON.parse(atob(idToken.split('.')[1]))
  if (payload.exp < currentTime) {
    // Limpia tokens expirados
    return null
  }

  return userFromToken
}

const fetcher = async () => {
  // Strategy 1: Try localStorage first
  const localUser = extractUserFromLocalStorage()
  if (localUser) return localUser

  // Strategy 2: Try Amplify
  return await getCurrentUser()
}
```

### 🐛 Bug #4: Tokens Expirados No Limpiados
**Problema en CloudAcademy:**
- No verifica expiración de tokens
- Tokens vencidos quedan en localStorage

**Solución en Agent:**
```typescript
const currentTime = Math.floor(Date.now() / 1000)

if (payload.exp < currentTime) {
  localStorage.removeItem(idTokenKey)
  localStorage.removeItem(accessTokenKey)
  localStorage.removeItem(userDataKey)
  localStorage.removeItem(lastAuthUserKey)
  return null
}
```

### 🐛 Bug #5: SignOut No Cierra Sesión en Cognito
**Problema en CloudAcademy:**
```typescript
await Auth.signOut()  // No especifica global: true
```
- Para OAuth providers, esto no cierra la sesión en Cognito completamente

**Solución en Agent:**
```typescript
await amplifySignOut({ global: true })  // Cierra sesión global en Cognito
```

### 🐛 Bug #6: Sin Sincronización de Estado Entre Componentes
**Problema en CloudAcademy:**
- No hay eventos entre _app.tsx y páginas
- Cambios de autenticación no se propagan

**Solución en Agent:**
```typescript
// En _app.tsx - dispatch evento
window.dispatchEvent(new CustomEvent('amplify-auth-success'))

// En useUser.ts - escucha evento
useEffect(() => {
  const handleAuthSuccess = () => {
    mutate() // Force revalidation
  }
  window.addEventListener('amplify-auth-success', handleAuthSuccess)
  return () => window.removeEventListener('amplify-auth-success', handleAuthSuccess)
}, [mutate])
```

### 🐛 Bug #7: Sin Logging para Debugging
**Problema en CloudAcademy:**
- Cero logging
- Debugging de problemas de auth es muy difícil

**Solución en Agent:**
- Logging extensivo en todos los pasos del flujo
- Performance tracking con `performance.now()`
- Emojis para identificar rápido el tipo de log

---

## 8. Plan de Migración Recomendado

### Fase 1: Actualizar Dependencias ⚠️ BREAKING CHANGES
```bash
cd app
npm install aws-amplify@^6.15.5
npm install @aws-amplify/ui-react@^6.11.2
npm install @aws-amplify/adapter-nextjs@^1.6.8
npm install next@^13.5.6
npm install react@^18.2.0
npm install react-dom@^18.2.0
```

**⚠️ ADVERTENCIA:** Esta actualización tiene BREAKING CHANGES. No commitear hasta completar todos los pasos.

### Fase 2: Actualizar _app.tsx
1. Cambiar imports:
   ```typescript
   import { Amplify } from 'aws-amplify'
   import { Hub } from 'aws-amplify/utils'
   import { ResourcesConfig } from 'aws-amplify'
   ```

2. Agregar Hub listener (agent/_app.tsx:19-43)

3. Cambiar configuración de Amplify (agent/_app.tsx:89-107)

4. Habilitar SSR: `Amplify.configure(amplifyConfig, { ssr: true })`

5. Mejorar loading state (agent/_app.tsx:46-63)

### Fase 3: Actualizar lib/useUser.ts
1. Cambiar imports:
   ```typescript
   import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth'
   ```

2. Agregar `extractUserFromLocalStorage()` (agent/useUser.ts:6-64)

3. Actualizar fetcher con múltiples estrategias (agent/useUser.ts:66-143)

4. Configurar SWR optimizado (agent/useUser.ts:147-157)

5. Agregar event listener (agent/useUser.ts:159-172)

6. Mover redirect a useEffect con ref (agent/useUser.ts:186-204)

7. Actualizar signOut (agent/useUser.ts:206-226)

### Fase 4: Actualizar pages/signin.tsx
1. Cambiar imports:
   ```typescript
   import { signInWithRedirect, getCurrentUser } from 'aws-amplify/auth'
   import { Hub } from 'aws-amplify/utils'
   ```

2. Reemplazar Authenticator con implementación manual (agent/signin.tsx)

3. Agregar Hub listener

4. Agregar detección de OAuth callback con reintentos

5. Agregar logging extensivo

### Fase 5: Testing
1. Test login con Google OAuth
2. Test redirect después de login
3. Test refresh de página (verificar persistencia)
4. Test logout
5. Test páginas protegidas
6. Test redirect loops (no deberían ocurrir)
7. Test expiración de tokens

### Fase 6: Cleanup
1. Remover código deprecated de Amplify v4
2. Limpiar imports no usados
3. Actualizar documentación (CLAUDE.md)

---

## 9. Archivos a Modificar

### Archivos Críticos (MUST CHANGE)
1. `app/package.json` - Actualizar versiones
2. `app/pages/_app.tsx` - Nueva configuración Amplify v6
3. `app/lib/useUser.ts` - Nueva API de auth
4. `app/pages/signin.tsx` - Implementación manual de OAuth

### Archivos Opcionales (NICE TO HAVE)
5. `app/lib/useEnv.ts` - Agregar fallbacks y logging
6. `app/next.config.ts` - Agregar `images.unoptimized` si usas `next export`
7. `app/.env.example` - Crear para documentación

### Archivos a Revisar (Páginas Protegidas)
8. `app/pages/admin.tsx` - Verificar que useUser funcione
9. `app/pages/bedrock.tsx` - Verificar que useUser funcione
10. `app/pages/rag-bedrock.tsx` - Verificar que useUser funcione
11. Todas las páginas que usen autenticación

---

## 10. Checklist de Verificación

### Pre-Migración
- [ ] Backup del código actual (git commit/branch)
- [ ] Documentar configuración actual de Cognito
- [ ] Documentar flujo de OAuth actual
- [ ] Tomar screenshots del flujo de login actual

### Durante Migración
- [ ] Actualizar package.json
- [ ] `npm install` sin errores
- [ ] Actualizar _app.tsx
- [ ] Actualizar useUser.ts
- [ ] Actualizar signin.tsx
- [ ] Actualizar useEnv.ts
- [ ] Fix TypeScript errors
- [ ] `npm run build` exitoso

### Post-Migración
- [ ] Test: Login con Google OAuth funciona
- [ ] Test: Redirect a página protegida funciona
- [ ] Test: Refresh mantiene sesión
- [ ] Test: Logout funciona correctamente
- [ ] Test: Login → Logout → Login funciona
- [ ] Test: Expiración de token maneja correctamente
- [ ] Test: No hay redirect loops
- [ ] Test: Loading states se muestran correctamente
- [ ] Test: Error messages se muestran correctamente
- [ ] Logs en consola son útiles para debugging

---

## 11. Riesgos y Mitigaciones

### Riesgo 1: Breaking Changes en Amplify v6
**Impacto:** Alto
**Probabilidad:** 100%
**Mitigación:**
- Seguir guía de migración oficial de Amplify
- Testear exhaustivamente antes de deploy
- Tener rollback plan (git branch)

### Riesgo 2: OAuth Redirects Rompen
**Impacto:** Crítico
**Probabilidad:** Media
**Mitigación:**
- Verificar callback URLs en Cognito User Pool Client
- Testear con diferentes environments (localhost, production)
- Implementar logging extensivo para debugging

### Riesgo 3: Tokens No Se Renuevan
**Impacto:** Alto
**Probabilidad:** Baja
**Mitigación:**
- Amplify v6 maneja refresh automáticamente
- Implementar extracción manual de localStorage como fallback
- Testear sesiones de larga duración

### Riesgo 4: SSR Causa Problemas
**Impacto:** Medio
**Probabilidad:** Baja
**Mitigación:**
- Verificar que todos los checks de `typeof window !== 'undefined'` estén
- Next.js 13 tiene mejor soporte SSR que v12
- Testear con `next build && next start`

---

## 12. Recursos Adicionales

### Documentación Oficial
- [Amplify v6 Migration Guide](https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/)
- [Amplify v6 Auth API Reference](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Next.js 13 Upgrade Guide](https://nextjs.org/docs/pages/building-your-application/upgrading/version-13)
- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)

### Breaking Changes a Revisar
- Amplify v4 → v6: [CHANGELOG](https://github.com/aws-amplify/amplify-js/blob/main/CHANGELOG.md)
- Next.js 12 → 13: [Upgrade Guide](https://nextjs.org/docs/pages/building-your-application/upgrading)
- React 17 → 18: [Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)

---

## 13. Conclusiones

### Hallazgos Clave
1. **Agent tiene una implementación significativamente más robusta** debido a:
   - Versiones actualizadas (Amplify v6, React 18, Next 13)
   - Manejo manual de OAuth con reintentos
   - Múltiples estrategias de autenticación (Amplify + localStorage)
   - Prevención de bugs comunes (redirect loops, tokens expirados)
   - Logging extensivo para debugging

2. **CloudAcademy confía demasiado en componentes automáticos**:
   - El Authenticator component oculta problemas
   - Sin visibilidad del flujo OAuth
   - Sin manejo de edge cases

3. **La migración es necesaria** para:
   - Resolver bugs de autenticación
   - Soportar versiones modernas de librerías
   - Mejorar experiencia de usuario
   - Facilitar debugging de problemas

### Recomendación Final
**Migrar completamente la implementación de agent a cloudacademy.**

El esfuerzo es justificado porque:
- ✅ Resuelve bugs existentes
- ✅ Previene bugs futuros
- ✅ Mejora mantenibilidad
- ✅ Soporta versiones modernas
- ✅ Mejor experiencia de usuario

**Tiempo estimado:** 4-6 horas de desarrollo + 2-4 horas de testing

---

## 14. Preguntas Frecuentes

### ¿Puedo migrar solo algunas partes?
**No recomendado.** Amplify v6 tiene una API completamente diferente. Es mejor migrar todo de una vez.

### ¿Funcionará con mi configuración de Cognito actual?
**Sí.** La configuración de Cognito no cambia, solo la forma de interactuar con ella desde el frontend.

### ¿Necesito actualizar Terraform?
**No.** La infraestructura de Cognito permanece igual.

### ¿Qué pasa con usuarios ya autenticados?
Los tokens existentes en localStorage seguirán funcionando. Los usuarios no necesitan volver a hacer login.

### ¿Cuándo debo hacer esta migración?
Lo antes posible, pero en un momento donde puedas:
- Dedicar tiempo ininterrumpido (4-6 horas)
- Testear exhaustivamente
- Tener rollback plan si algo falla

---

**Documento generado por Claude Code**
**Fecha:** 26 de Octubre, 2025
