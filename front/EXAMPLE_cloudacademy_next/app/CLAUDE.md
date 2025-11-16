# CloudAcademy Next.js Project - Context

## Configuración del Proyecto
- **Framework**: Next.js 13.5.6 con TypeScript
- **React**: 18.2.0
- **Styling**: Tailwind CSS v4
- **Auth**: AWS Amplify v6 (migrado desde v4) + Cognito
- **Deployment**: Static export a S3 + CloudFront
- **Infrastructure**: Terraform + AWS (S3, CloudFront, Cognito, Bedrock)
- **CI/CD**: GitHub Actions with comprehensive DevOps pipeline

## 🔄 Migración Amplify v4 → v6 (Agent Fusion)

**Fecha:** 26 de Octubre, 2025
**Branch:** agent-fusion
**Estado:** ✅ Completado

### Cambios Principales

#### Dependencias Actualizadas
```json
{
  "aws-amplify": "^6.15.5",              // was ^4.3.14
  "@aws-amplify/ui-react": "^6.11.2",    // was ^2.6.1
  "@aws-amplify/adapter-nextjs": "^1.6.8", // NEW
  "next": "^13.5.6",                     // was 12.1.0
  "react": "^18.2.0",                    // was 17.0.2
  "react-dom": "^18.2.0"                 // was 17.0.2
}
```

#### Breaking Changes Aplicados
1. **Configuración de Amplify**: Cambió de objeto plano a `ResourcesConfig` con estructura anidada
2. **Imports**: Cambiados de `'aws-amplify'` a `'aws-amplify/auth'` y `'aws-amplify/utils'`
3. **API de Auth**:
   - `Auth.currentAuthenticatedUser()` → `getCurrentUser()`
   - `Auth.currentSession()` → `fetchAuthSession()`
   - `Auth.signOut()` → `signOut()`
4. **SSR Support**: Agregado `{ ssr: true }` a configuración
5. **Hub Events**: Implementados para manejar callbacks de OAuth

#### Nuevas Features
- ✅ **localStorage Fallback**: Estrategia de autenticación con extracción directa de tokens
- ✅ **Anti-Redirect Loop**: Protección con useRef para evitar loops infinitos
- ✅ **Hub Listeners**: Eventos en tiempo real para auth (signedIn, signInWithRedirect, etc.)
- ✅ **OAuth Manual**: Implementación manual de Google OAuth sin Authenticator component
- ✅ **Email/Password + Google**: Doble método de autenticación en signin page
- ✅ **Token Expiration Check**: Validación automática de expiración de JWT
- ✅ **Multi-Strategy Auth**: localStorage → getCurrentUser → fetchAuthSession

#### Archivos Migrados
- ✅ `package.json` - Dependencias actualizadas
- ✅ `pages/_app.tsx` - Configuración Amplify v6 + Hub listeners
- ✅ `lib/useUser.ts` - Hook de autenticación con localStorage fallback
- ✅ `pages/signin.tsx` - OAuth manual + Email/Password forms
- ✅ `lib/useEnv.ts` - Configuración dev/prod con logging
- ✅ `hooks/useBedrockChat.ts` - fetchAuthSession para tokens
- ✅ `components/AuthenticatedHeader.tsx` - Estructura de user simplificada

#### Configuración de Producción
- ✅ **GitHub Secrets**: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_DOMAIN
- ✅ **Callback URLs**: `/signin`, `/admin`, `/` en Cognito
- ✅ **env.json**: Generado en build con secrets de Cognito

### Documentación de Referencia
- [Comparación vs Agent](../comparacion-vs-agent.md)
- [Task List Detallado](../task-agent-fusion.md)

## Arquitectura de Páginas
- `/` - Home estilo Platzi con grid de cursos
- `/admin` - Dashboard con autenticación
- `/admin-panel` - Panel de administración CRUD de cursos (Admin only)
- `/courses` - Catálogo público de cursos (sin autenticación)
- `/courses/[id]` - Página de curso individual con AI Tutor integrado
- `/bedrock` - Curso interactivo de RAG con Amazon Bedrock
- `/signin` - Página de login
- `/build-vpc` - Curso VPC (próximo a implementar)

## Infrastructure Overview

### Terraform Modules
1. **terraform-bedrock/**: AWS Bedrock IAM permissions y credentials
2. **terraform/frontend/**: S3 + CloudFront + ACM para hosting estático  
3. **terraform/backend/**: Cognito User Pool + Google OAuth integration

### AWS Resources Deployed
- **S3 Buckets**: Static website hosting con encryption y versioning
- **CloudFront**: CDN global con SSL certificates
- **ACM Certificates**: SSL/TLS para dominios custom
- **Cognito User Pool**: Authentication con Google OAuth
- **IAM Roles/Policies**: Bedrock permissions para FastAPI
- **SSM Parameters**: Secured storage para Bedrock credentials

## CI/CD Pipeline Architecture

### Current Branch Structure
- **main**: Production branch
- **november2025**: Current development branch
- **agent-fusion**: Auth migration branch (Amplify v6) - READY TO MERGE
- **bedrock1**: Legacy branch con Bedrock functionality
- **vpc**: Previous working branch para VPC course development

### GitHub Actions Workflows

#### terraform-bedrock.yml (Status: ✅ Working)
```yaml
Stages:
🧹 Code Quality & Validation → 🔐 Security & Compliance → 💰 Cost Analysis → 📋 Terraform Plan → 🚀 Terraform Apply
```
- **Triggers**: Push/PR to bedrock1, vpc branches + terraform-bedrock/** paths
- **Features**: TFLint, tfsec, Checkov, Infracost (~$0.05/month), manual approval (disabled)
- **Outputs**: IAM credentials para Bedrock API access

#### terraform-frontend.yml (Status: ✅ Working)  
```yaml
Stages:
🧹 Code Quality & Validation → 🔐 Security & Compliance → 💰 Cost Analysis → 📋 Terraform Plan → 🚀 Terraform Apply
```
- **Triggers**: Push/PR to vpc branch + terraform/frontend/** paths
- **Features**: Frontend infrastructure deployment, Infracost (~$15.50/month)
- **Outputs**: S3 bucket, CloudFront distribution, SSL certificates

#### terraform-backend.yml (Status: ✅ Working)
```yaml  
Stages:
🧹 Code Quality & Validation → 🔐 Security & Compliance → 💰 Cost Analysis → 📋 Terraform Plan → 🚀 Terraform Apply
```
- **Triggers**: Push/PR to vpc branch + terraform/backend/** paths
- **Features**: Cognito setup con Google OAuth, Infracost (~$2.00/month)
- **Environment Variables**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### DevOps Best Practices Implemented
1. **Code Quality**: Terraform fmt, validate, TFLint
2. **Security**: tfsec static analysis, Checkov compliance scanning
3. **Cost Control**: Infracost analysis con GitHub API integration
4. **Planning**: Terraform plan artifacts con retention (30 days)  
5. **State Backup**: Terraform state artifacts (90 days retention)
6. **Manual Approval**: Ready to enable when needed (currently disabled)

## Configuraciones Importantes

### Tailwind CSS v4
```js
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### Authentication Architecture (AWS Cognito + Amplify)

#### Frontend Authentication Configuration (`pages/_app.tsx`)
```tsx
// Complete Amplify configuration
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: env.cognitoUserPoolId,              // From Terraform output
    userPoolWebClientId: env.cognitoUserPoolWebClientId, // From Terraform output
    oauth: {
      domain: env.cognitoDomain,                    // From Terraform output
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      redirectSignOut: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      responseType: 'code',
      options: {
        AdvancedSecurityDataCollectionFlag: false,
      },
    },
  },
})
```

#### Environment Configuration (`lib/useEnv.ts`)
```tsx
// Dual-mode configuration (dev/prod)
const useEnv = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      cognitoUserPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
      cognitoUserPoolWebClientId: process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID,
      cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    }
  }
  
  // Production: fetch from /env.json endpoint
  const { data } = useSWR('/env.json', fetcher)
  return data || {}
}
```

#### Authentication Hook (`lib/useUser.ts`)
```tsx
// Complete authentication state management
export default function useUser({ redirect = '' } = {}) {
  const { cache } = useSWRConfig()
  const { data: user, error } = useSWR('user', fetcher)

  const loading = !user && !error
  const loggedOut = error && error === 'The user is not authenticated'

  // Auto-redirect if not authenticated
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

#### Protected Page Pattern (`pages/admin.tsx`, `pages/bedrock.tsx`)
```tsx
// Method 1: Manual protection with useUser hook
const Admin: NextPage = () => {
  const { user, loading, loggedOut, signOut } = useUser({ redirect: '/signin' })

  if (loading) return <div>Loading...</div>
  if (loggedOut) return <div>Redirecting...</div>

  // Protected content only renders if authenticated
  return <AuthenticatedContent user={user} signOut={signOut} />
}

// Method 2: Amplify Authenticator wrapper
const BedrockCourse: NextPage = () => {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <BedrockCourseContent user={user} signOut={signOut} />
      )}
    </Authenticator>
  )
}
```

#### Login Implementation (`pages/signin.tsx`)
```tsx
// Complete signin page with Google OAuth
const SignIn: NextPage = () => {
  return (
    <Authenticator
      components={{
        Header: () => <div>CloudAcademy Login</div>,
        Footer: () => <div>Terms & Conditions</div>,
      }}
      services={{
        async validateCustomSignUp(formData) {
          if (!formData.acknowledgement) {
            return { acknowledgement: 'You must agree to the Terms & Conditions' }
          }
        },
      }}
    >
      {({ signOut, user }) => {
        // Auto-redirect after successful login
        Router.push('/admin')
        return <div>Redirecting...</div>
      }}
    </Authenticator>
  )
}
```

### Backend Authentication (FastAPI + Cognito JWT)

#### JWT Token Validation (`fastapi-backend/app/auth/cognito_auth.py`)
```python
def verify_cognito_jwt(token: str) -> Dict[str, Any]:
    """Validate Cognito JWT token using public keys"""
    
    # Extract key ID from token header
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get('kid')
    
    # Fetch Cognito public keys
    keys_url = f"https://cognito-idp.{settings.aws_region}.amazonaws.com/{settings.cognito_user_pool_id}/.well-known/jwks.json"
    keys = get_cognito_public_keys()['keys']
    
    # Find matching public key
    public_key = None
    for key in keys:
        if key['kid'] == kid:
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            break
    
    if not public_key:
        raise HTTPException(status_code=401, detail="Unable to find matching key")
    
    # Verify and decode JWT
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=settings.cognito_client_id,
            issuer=f"https://cognito-idp.{settings.aws_region}.amazonaws.com/{settings.cognito_user_pool_id}",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### Protected API Endpoints (`fastapi-backend/app/api/chat.py`)
```python
# Dependency injection for authentication
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInfo:
    """Extract user info from Cognito JWT token"""
    payload = verify_cognito_jwt(token)
    
    return UserInfo(
        user_id=payload.get('sub'),
        email=payload.get('email'),
        name=payload.get('name'),
        picture=payload.get('picture'),
        groups=payload.get('cognito:groups', [])
    )

# Protected endpoint
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    current_user: UserInfo = Depends(get_current_user)  # JWT validation here
):
    """Bedrock chat endpoint - requires valid Cognito JWT"""
    # User is authenticated, proceed with chat logic
    return await bedrock_agent.process_chat(request, current_user)
```

#### Token Extraction in Frontend (`hooks/useBedrockChat.ts`)
```tsx
const getAuthToken = async (): Promise<string> => {
  try {
    // Method 1: Get from current Amplify session (preferred)
    const session = await Auth.currentSession()
    return session.getIdToken().getJwtToken()
  } catch (error) {
    // Method 2: Fallback to localStorage
    const clientId = '7ho22jco9j63c3hmsrsp4bj0ti'
    const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`)
    
    if (lastAuthUser) {
      const idTokenKey = `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`
      const token = localStorage.getItem(idTokenKey)
      
      if (token) return token
    }
    
    throw new Error('No authentication token found')
  }
}

// Usage in API calls
const sendMessage = async (message: string) => {
  const token = await getAuthToken()
  
  const response = await fetch('/api/bedrock/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,  // JWT sent to backend
    },
    body: JSON.stringify({ message }),
  })
  
  return response.json()
}
```

### Terraform Cognito Infrastructure (`terraform/backend/main.tf`)

#### User Pool Configuration
```hcl
resource "aws_cognito_user_pool" "user_pool" {
  name = "UserPool"

  # Email-based authentication
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  # Lambda post-confirmation trigger
  lambda_config {
    post_confirmation = aws_lambda_function.post_confirmation.arn
  }

  # Custom attributes for Google OAuth
  schema {
    attribute_data_type = "String"
    name               = "email"
    required           = true
    mutable           = true
    string_attribute_constraints {
      min_length = 7
      max_length = 256
    }
  }

  schema {
    attribute_data_type = "String"
    name               = "picture"
    required           = false
    mutable           = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
}
```

#### Google OAuth Integration
```hcl
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.user_pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id      # From GitHub Secrets
    client_secret    = var.google_client_secret  # From GitHub Secrets
    authorize_scopes = "email openid profile"
  }

  # Map Google attributes to Cognito
  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
    picture  = "picture"
  }
}
```

#### User Pool Client Configuration
```hcl
resource "aws_cognito_user_pool_client" "user_pool_client" {
  name         = "UserPoolClient"
  user_pool_id = aws_cognito_user_pool.user_pool.id

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs for different environments
  callback_urls = [
    "https://${aws_cognito_user_pool_domain.user_pool_domain.domain}.auth.us-east-1.amazoncognito.com/oauth2/idpresponse",
    "http://localhost:3000",           # Development
    var.production_callback_url        # Production: https://proyectos.cloudacademy.ar
  ]

  logout_urls = [
    "http://localhost:3000",
    var.production_logout_url
  ]

  # Support Google OAuth only
  supported_identity_providers = ["Google"]

  # Token validity periods
  access_token_validity  = 24   # 24 hours
  id_token_validity      = 24   # 24 hours  
  refresh_token_validity = 720  # 30 days

  # Security settings
  prevent_user_existence_errors = "ENABLED"
  generate_secret = false  # Public client for SPA

  depends_on = [aws_cognito_identity_provider.google]
}
```

#### OAuth Domain Configuration
```hcl
resource "aws_cognito_user_pool_domain" "user_pool_domain" {
  domain       = "cloudacademy-auth-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.user_pool.id
}

# Terraform outputs for application configuration
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.user_pool.id
}

output "cognito_user_pool_web_client_id" {
  description = "Cognito User Pool Web Client ID"
  value       = aws_cognito_user_pool_client.user_pool_client.id
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool Domain for OAuth"
  value       = aws_cognito_user_pool_domain.user_pool_domain.domain
}
```

### Complete Authentication Flow

#### 1. **Login Process**
```
User visits /signin 
→ Amplify Authenticator component loads
→ User clicks "Continue with Google" 
→ Redirect to Cognito OAuth endpoint
→ Google OAuth consent screen
→ Google returns authorization code to Cognito
→ Cognito exchanges code for JWT tokens
→ Amplify receives tokens and stores in localStorage
→ User redirected to /admin (protected page)
```

#### 2. **Protected Page Access**
```
User visits /admin
→ useUser hook runs
→ SWR fetches user from Auth.currentAuthenticatedUser()
→ If authenticated: page renders with user data
→ If not authenticated: redirect to /signin
```

#### 3. **API Request Authentication**
```
Frontend makes API call
→ getAuthToken() extracts JWT from Amplify session
→ Token sent in Authorization: Bearer <jwt> header
→ FastAPI verify_cognito_jwt() validates token
→ If valid: extract user info and proceed
→ If invalid: return 401 Unauthorized
```

#### 4. **Token Lifecycle**
```
Login: Cognito issues Access + ID + Refresh tokens
→ Access Token: API authorization (24h validity)
→ ID Token: User identity information (24h validity)  
→ Refresh Token: Renew expired tokens (30 days validity)
→ Amplify automatically refreshes tokens when needed
```

### Security Features

#### Frontend Protection
- **Route Guards**: useUser hook with automatic redirect
- **Component Guards**: Authenticator wrapper for sensitive pages
- **Token Storage**: Secure localStorage with automatic cleanup
- **CSRF Protection**: OAuth state parameter validation

#### Backend Protection  
- **JWT Signature Validation**: Using Cognito's public keys
- **Token Expiration**: Automatic expiry checking
- **Audience Validation**: Ensures token is for this application
- **Issuer Validation**: Confirms token from correct Cognito pool

#### Infrastructure Security
- **No Client Secret**: Public SPA client configuration
- **HTTPS Enforced**: All OAuth redirects use HTTPS in production
- **Domain Restrictions**: Callback URLs limited to known domains
- **Rate Limiting**: Cognito built-in protection against abuse

## Comandos de Build
```bash
npm run build     # Construir proyecto
npm run dev       # Desarrollo local

# Terraform commands
terraform fmt     # Format code (required by pipeline)
terraform validate # Validate configuration  
terraform plan    # Generate execution plan
terraform apply   # Deploy infrastructure
```

## Technical Decisions Made

### Infrastructure as Code
- **Decision**: Use Terraform over CDK/CloudFormation
- **Reason**: Better multi-cloud support, team familiarity, state management
- **Impact**: Consistent infrastructure deployments, version control

### CI/CD Pipeline Design  
- **Decision**: Comprehensive 5-stage pipeline with security/cost analysis
- **Reason**: Enterprise-grade practices, cost visibility, security compliance
- **Impact**: Higher confidence deployments, proactive cost/security monitoring

### Authentication Strategy
- **Decision**: AWS Cognito + Google OAuth instead of custom auth
- **Reason**: Managed service, OAuth integration, scalable
- **Impact**: Reduced maintenance, better UX, enterprise SSO ready

### Branch Strategy
- **Decision**: Feature branches (vpc) for development, main for production
- **Reason**: Safe experimentation, code review process, stable main
- **Impact**: Parallel development, reduced production issues

## Problemas Resueltos

### Frontend Issues
1. **Tailwind CSS no cargaba**: Migración a v4 con plugin correcto
2. **Auth fallaba**: Faltaba configuración de región AWS
3. **TypeScript errors**: Tipado correcto de estado React
4. **ESLint errors**: Escape de caracteres especiales en JSX

### Infrastructure Issues  
5. **Terraform formatting**: Pipeline requiere `terraform fmt` antes de commits
6. **Provider configuration**: Missing random provider en backend module
7. **Backend validation**: Local backend switching para validation sin AWS credentials
8. **tfsec rate limiting**: Agregado github_token para authenticated API requests
9. **Infracost API access**: Required environment: dev para access secrets

### Pipeline Issues
10. **AWS credentials syntax**: GitHub Actions expressions require proper format
11. **TFLint warnings**: Configured graceful handling of warning exit codes  
12. **Manual approval**: Implemented but disabled para faster development cycles
13. **Rover visualization**: Attempted integration pero removed due to complexity

## Current State

### Infrastructure Deployed (vpc branch)
- ✅ **Bedrock Module**: IAM permissions, SSM parameters para API access
- ✅ **Frontend Module**: S3, CloudFront, ACM certificates  
- ✅ **Backend Module**: Cognito User Pool con Google OAuth
- ✅ **CI/CD Pipelines**: All 3 modules con comprehensive DevOps practices

### Application Status
- ✅ **Next.js Frontend**: Deployed y functional
- ✅ **FastAPI Backend**: Kubernetes deployment con Bedrock integration
- ✅ **Authentication**: Working Google OAuth flow
- ✅ **Bedrock Chat**: Interactive RAG interface functional

### Environments
- **Development**: vpc branch con all features
- **Production**: main branch (stable)
- **Staging**: bedrock1 branch (legacy)

## Pending Tasks & Next Steps

### High Priority
1. **VPC Course Development**: Create `/build-vpc` page content
2. **Production Deployment**: Merge vpc → main when VPC course ready
3. **Domain Configuration**: Setup proyectos.cloudacademy.ar DNS
4. **SSL Certificate Validation**: Complete ACM certificate DNS validation

### Medium Priority  
5. **Cost Optimization**: Review Infracost reports and optimize resources
6. **Security Review**: Address any tfsec/Checkov findings
7. **Monitoring**: Add CloudWatch dashboards para infrastructure health
8. **Backup Strategy**: Implement automated Terraform state backups

### Low Priority
9. **Manual Approval**: Enable for production deployments
10. **Multi-environment**: Separate dev/staging/prod Terraform workspaces  
11. **Documentation**: Add infrastructure diagrams
12. **Testing**: Add integration tests para deployment pipelines

## Diseño
- Tema oscuro con gradientes azul/slate
- Estilo similar a Platzi para el home
- Diseño responsive con grids
- Componentes interactivos con estados React
- Infrastructure visualization (future: consider alternatives to Rover)

---

## 🎓 Fase 7: Catálogo Público + Metadata de Cursos (Noviembre 2025)

**Fecha:** 2025-11-02
**Branch:** agent-fusion
**Estado:** ✅ Completado

### Resumen

Se implementaron 3 mejoras principales al sistema:

1. **Fix CORS** - Solucionado error 403 en preflight requests del admin panel
2. **Catálogo Público** - Sistema completo de navegación y visualización de cursos
3. **Metadata Enriquecida** - Campos adicionales para cursos (tiempo, costo, resumen, introducción)

### Archivos Creados

#### app/hooks/useCourses.ts (NUEVO - 140 líneas)

Hook público para acceso al catálogo de cursos sin autenticación.

**Diferencias con useAdminCourses:**
- ❌ Sin autenticación requerida
- ✅ Solo cursos publicados (`is_published: true`)
- ✅ Endpoint público: `GET /api/courses`

**API:**
```typescript
const {
  courses,           // Course[] - solo publicados
  loading,
  error,
  fetchCourses,      // () => Promise<void>
  fetchCourseDetail, // (id: string) => Promise<CourseDetail | null>
} = useCourses()

interface Course {
  course_id: string
  course_name: string
  description: string
  category: string
  difficulty: string
  total_sections: number
  is_published: boolean
  // Fase 1 - Metadata
  estimated_time?: string    // "2 horas", "3 días"
  cost?: number              // USD, 0 = gratis
  summary_30s?: string       // Max 300 chars
  introduction?: string      // Texto largo
}

interface CourseDetail extends Course {
  sections: Section[]
}
```

#### app/pages/courses.tsx (NUEVO - 300+ líneas)

Catálogo público de cursos con grid responsive.

**Features:**
- Grid 1/2/3 columnas (mobile/tablet/desktop)
- Stats overview (total cursos, secciones, estudiantes)
- Category icons (AWS 🚀, DevOps ⚙️, Security 🔒, Database 🗄️)
- Difficulty badges color-coded
- Loading/error/empty states
- Click → Navigate to `/courses/[id]`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  🎓 Catálogo de Cursos                              │
│  Explora cursos interactivos con IA                 │
│                                                      │
│  📚 12 Cursos | 📖 45 Secciones | 👥 230 Estudiantes│
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┐
│ 🚀 AWS   │ ⚙️ DevOps│ 🔒 Sec.  │
│ Image Gen│ Terraform│ IAM      │
│ Beginner │ Beginner │ Advanced │
│ 3 horas  │ 4 horas  │ 6 horas  │
│ Ver →    │ Ver →    │ Ver →    │
└──────────┴──────────┴──────────┘
```

#### app/pages/courses/[id].tsx (NUEVO - 350+ líneas)

Página de curso individual con secciones + AI Tutor.

**Layout:** 2 columnas en desktop, stacked en mobile

**Features:**
- Header con metadata completa del curso
- Lista de secciones con click para seleccionar
- BedrockChatInterface integrado con contexto
- Sección activa marcada en verde
- Botón "Volver al Catálogo"
- Help section con instrucciones

**Componentes:**
```tsx
<CoursePage>
  <CourseHeader course={course} />

  <Grid cols="lg:grid-cols-2">
    {/* Left: Sections */}
    <SectionsList
      sections={course.sections}
      currentSection={currentSection}
      onSelectSection={setCurrentSection}
    />

    {/* Right: AI Tutor */}
    <BedrockChatInterface
      courseContext={course.course_id}
      courseStep={currentSection}
    />
  </Grid>

  <HelpSection />
</CoursePage>
```

**Important Fix:**
```tsx
// ❌ Error original (causaba fallo en CI/CD)
<BedrockChatInterface stepId={currentSection} />

// ✅ Correcto
<BedrockChatInterface courseStep={currentSection} />
```

### Archivos Modificados

#### app/hooks/useAdminCourses.ts

Agregados nuevos campos a interfaces:

```typescript
export interface Course {
  // ... campos existentes

  // Fase 1 - Metadata
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
}

export interface CreateCourseInput {
  // ... campos existentes

  // Fase 1 - Metadata
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
}

export interface UpdateCourseInput {
  // ... campos existentes

  // Fase 1 - Metadata
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
}
```

#### app/pages/admin-panel.tsx

Formulario actualizado con 4 campos nuevos:

**1. Tiempo Estimado**
```tsx
<input
  type="text"
  value={formData.estimated_time}
  onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
  placeholder="ej: 2 horas, 3 días, 1 semana"
/>
```

**2. Costo (USD)**
```tsx
<input
  type="number"
  min="0"
  step="0.01"
  value={formData.cost}
  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
  placeholder="0 = Gratis"
/>
<p className="text-xs text-gray-500">0 = Curso gratuito</p>
```

**3. Resumen en 30 Segundos**
```tsx
<textarea
  value={formData.summary_30s}
  onChange={(e) => setFormData({ ...formData, summary_30s: e.target.value })}
  maxLength={300}
  rows={3}
  placeholder="Descripción breve y atractiva (máx 300 caracteres)"
/>
<p className="text-xs text-gray-500">
  {formData.summary_30s?.length || 0}/300 caracteres
</p>
```

**4. Introducción**
```tsx
<textarea
  value={formData.introduction}
  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
  rows={5}
  placeholder="Introducción detallada del curso: objetivos, requisitos, qué aprenderás..."
/>
```

**Campos removidos:**
- ❌ "Total de Secciones" (se calcula automáticamente desde secciones)

### Backend Changes (Ref: cloudacademy-tutor-backend)

Ver documentación completa en: `FASE_7_COMPLETADA.md`

**Resumen:**
- ✅ CORS OPTIONS methods en API Gateway (17 recursos nuevos)
- ✅ Lambda admin-handler actualizada con nuevos campos de metadata
- ✅ Endpoints públicos sin autenticación para catálogo

### Flujo de Usuario

```
Landing Page (/)
  ↓
Click "Ver Cursos"
  ↓
Catálogo (/courses)
  ↓ [GET /api/courses - Sin auth]
  ↓ Filter: is_published = true
  ↓
Grid de Cursos
  ↓
Click en curso
  ↓
Página de Curso (/courses/{id})
  ↓ [GET /api/courses/{id} - Sin auth]
  ↓
Curso + Secciones + AI Tutor
  ↓
Usuario selecciona sección
  ↓
BedrockChatInterface actualiza contexto
  ↓
Usuario hace preguntas
  ↓ [POST /api/tutor/ask - Requiere auth]
  ↓
Respuestas contextuales
```

### Testing

**Casos de prueba:**
1. ✅ Catálogo carga sin autenticación
2. ✅ Solo muestra cursos con `is_published: true`
3. ✅ Navegación a curso individual funciona
4. ✅ Secciones se pueden seleccionar
5. ✅ AI Tutor responde con contexto correcto
6. ✅ Admin panel crea cursos con nuevos campos
7. ✅ No hay errores CORS en console
8. ✅ Build de Next.js sin errores TypeScript

### Problemas Resueltos

**1. CORS 403 Error**
- **Error:** Preflight request blocked con 403
- **Causa:** Faltaban métodos OPTIONS en API Gateway
- **Fix:** Agregados OPTIONS con Mock Integration + headers CORS
- **Commit:** Backend `4a3b2c1`

**2. TypeScript Error en Build**
- **Error:** `Property 'stepId' does not exist on type 'BedrockChatInterfaceProps'`
- **Causa:** Prop name incorrecto en courses/[id].tsx
- **Fix:** Cambiar `stepId` a `courseStep`
- **Commit:** Frontend `409b2b4`

### Próximos Pasos: Fase 2

**Editor de Steps/Secciones** (19 horas estimadas)

Pendiente de implementar:
- Página `/admin-panel/courses/[id]/sections`
- Rich text editor para contenido de secciones
- Upload de imágenes a S3
- Configuración de agente IA por step
- Drag & drop para reordenar secciones

Ver plan detallado en: `cloudacademy-tutor-backend/FASE_7_COMPLETADA.md`

### Commits Relacionados

**Frontend (cloudacademy_next):**
- `f57a8c0` - "Fase 1: Agregar campos de metadata al formulario de cursos"
- `409b2b4` - "Fix: Cambiar stepId a courseStep en BedrockChatInterface"

**Backend (cloudacademy-tutor-backend):**
- `4a3b2c1` - "Fase 1: Agregar campos de metadata al curso"
- `7e8d9f2` - "Fix CORS: Agregar OPTIONS methods a API Gateway"

---

## Session History Notes
- Context auto-compacts at 0% - this file preserves important decisions and state
- All major infrastructure and pipeline work completed in vpc branch
- Rover visualization attempt abandoned due to CI/CD complexity
- Focus shifted to core Terraform pipeline functionality
- Ready for VPC course content development