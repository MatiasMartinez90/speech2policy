# CloudAcademy Next.js - Arquitectura Completa

## Resumen del Proyecto
CloudAcademy es una plataforma de cursos online construida con Next.js, que incluye autenticación con AWS Cognito, un diseño moderno inspirado en Platzi, y cursos interactivos como el proyecto de RAG con Amazon Bedrock.

## Stack Tecnológico

### Frontend
- **Next.js**: Framework React con renderizado estático
- **TypeScript**: Tipado estático para mejor desarrollo
- **Tailwind CSS v4**: Sistema de diseño utility-first
- **React**: Librería para componentes UI

### Backend/Auth
- **AWS Amplify**: SDK para integración con servicios AWS
- **Amazon Cognito**: Servicio de autenticación y autorización
- **Region**: us-east-1

### Build & Deploy
- **GitHub Actions**: CI/CD pipeline
- **Next.js Export**: Generación de sitio estático
- **ESBuild**: Bundler para configuración

## Estructura de Archivos

```
/app
├── pages/                 # Páginas de Next.js (file-based routing)
│   ├── _app.tsx          # Configuración global de la app
│   ├── index.tsx         # Home page estilo Platzi
│   ├── admin.tsx         # Dashboard con autenticación
│   ├── bedrock.tsx       # Curso interactivo de RAG
│   ├── signin.tsx        # Página de login
│   └── example.tsx       # Página de ejemplo
├── styles/
│   └── globals.css       # Estilos globales con Tailwind
├── public/               # Archivos estáticos
├── .env.local           # Variables de entorno
├── next.config.ts       # Configuración de Next.js
├── postcss.config.js    # Configuración de PostCSS para Tailwind
├── tailwind.config.js   # Configuración de Tailwind CSS
└── package.json         # Dependencias y scripts
```

## Sistema de Routing

### Next.js File-Based Routing
Cada archivo en `/pages` se convierte automáticamente en una ruta:

- `/pages/index.tsx` → `/` (home)
- `/pages/admin.tsx` → `/admin` 
- `/pages/bedrock.tsx` → `/bedrock`
- `/pages/signin.tsx` → `/signin`

### Navegación Entre Páginas
```tsx
import Router from 'next/router'

// Navegación programática
const goToAdmin = () => {
  Router.push('/admin')
}

// En JSX
<button onClick={goToAdmin}>Ir a Admin</button>
```

## Configuración de Tailwind CSS v4

### Instalación y Setup
```bash
npm install @tailwindcss/postcss
```

### postcss.config.js
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // Plugin específico para v4
  },
}
```

### styles/globals.css
```css
@import "tailwindcss";  /* Sintaxis v4 - NO usar @tailwind directives */
```

### tailwind.config.js
```js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Clases Principales Utilizadas
- **Layouts**: `min-h-screen`, `flex`, `grid`
- **Backgrounds**: `bg-slate-900`, `bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900`
- **Borders**: `border border-slate-700/50`, `rounded-xl`
- **Spacing**: `p-6`, `mb-4`, `space-y-4`
- **Typography**: `text-white`, `font-bold`, `text-xl`
- **Effects**: `backdrop-blur-sm`, `hover:scale-105`, `transition-all`

## Sistema de Autenticación con AWS Cognito

### Configuración en _app.tsx
```tsx
import { Amplify } from 'aws-amplify'

// Configuración de Amplify
Amplify.configure({
  Auth: {
    region: 'us-east-1',                    // IMPORTANTE: Region específica
    userPoolId: env.cognitoUserPoolId,      // User Pool ID de Cognito
    userPoolWebClientId: env.cognitoUserPoolWebClientId,  // App Client ID
  },
})
```

### Variables de Entorno (.env.local)
```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Hook de Autenticación
```tsx
import { useAuthenticator } from '@aws-amplify/ui-react'

const { user, signOut } = useAuthenticator((context) => [
  context.user,
  context.signOut
])

// Proteger rutas
if (!user) {
  return <div>Please sign in</div>
}
```

### Componente de Login
```tsx
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

// Página de signin
<Authenticator>
  {({ signOut, user }) => (
    <div>Welcome {user.username}</div>
  )}
</Authenticator>
```

## Páginas Principales

### 1. Home Page (index.tsx)
**Diseño**: Inspirado en Platzi
**Características**:
- Header con navegación y buscador
- Hero section con gradientes
- Grid responsive de cursos
- Filtros por categoría
- Estadísticas en cards

**Componentes clave**:
```tsx
// Datos de cursos
const courses = [
  {
    id: 1,
    title: "Full Stack Developer con JavaScript",
    description: "...",
    icon: "⚡",
    color: "bg-yellow-500",
    instructor: "Por Juan Pérez",
    category: "JavaScript"
  }
]

// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {courses.map((course) => (
    <div key={course.id} className="...">
      {/* Card del curso */}
    </div>
  ))}
</div>
```

### 2. Admin Dashboard (admin.tsx)
**Autenticación**: Requiere login con Cognito
**Características**:
- Panel de control post-login
- Cards de cursos con progreso
- Curso destacado (Bedrock) con navegación especial
- Estadísticas de usuario

**Protección de ruta**:
```tsx
const { user } = useAuthenticator()
if (!user) {
  return <Authenticator />
}
```

### 3. Bedrock Course (bedrock.tsx)
**Tipo**: Curso interactivo paso a paso
**Características**:
- Sidebar con navegación de pasos
- Contenido educativo sobre RAG (Retrieval Augmented Generation)
- Formularios interactivos con estado React
- Navegación secuencial entre pasos

**Estado de React**:
```tsx
const [currentTaskStep, setCurrentTaskStep] = useState(0)
const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({
  step0: '',
  step1: '',
  step2: '',
  step3: ''
})

// Manejo de respuestas
const handleTaskAnswer = (stepId: number, answer: string) => {
  setTaskAnswers(prev => ({
    ...prev,
    [`step${stepId}`]: answer
  }))
}
```

## Tipado con TypeScript

### Interfaces Principales
```tsx
// Tipo de página Next.js
import type { NextPage } from 'next'

// Interface para cursos
interface Course {
  id: number
  title: string
  description: string
  icon: string
  color: string
  instructor: string
  category: string
  featured?: boolean
}

// Componente tipado
const Home: NextPage = () => {
  return <div>...</div>
}
```

### Estado con Tipado
```tsx
// Estado tipado para respuestas
const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({
  step0: '',
  step1: '',
  step2: '',
  step3: ''
})
```

## Build y Deployment

### Scripts de Package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "npm run build:config && next build && next export",
    "build:config": "esbuild next.config.ts --bundle --outfile=next.config.js --platform=node --target=es2020",
    "start": "next start"
  }
}
```

### GitHub Actions Pipeline
El proyecto se despliega automáticamente cuando se hace push a la rama principal:
1. **Install**: `npm install`
2. **Build**: `npm run build`
3. **Export**: Genera archivos estáticos en `/out`
4. **Deploy**: Sube a hosting estático

### Consideraciones para Build
- **ESLint**: Escapar caracteres especiales con `&apos;` y `&quot;`
- **TypeScript**: Tipado correcto de todas las variables
- **Next.js**: Configuración correcta para export estático

## Patrones de Diseño

### Tema Oscuro Consistente
```tsx
// Background principal
className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"

// Cards con transparencia
className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl"

// Texto
className="text-white"     // Títulos principales
className="text-gray-300"  // Texto secundario
className="text-gray-400"  // Texto terciario
```

### Componentes Reutilizables
```tsx
// Botones con gradiente
className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"

// Cards hover effect
className="group hover:transform hover:scale-105 cursor-pointer transition-all duration-300"
```

## Próximos Pasos para Desarrollo

### Agregar Nueva Página
1. Crear archivo en `/pages/nueva-pagina.tsx`
2. Usar el template base:
```tsx
import type { NextPage } from 'next'

const NuevaPagina: NextPage = () => {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Contenido */}
    </div>
  )
}

export default NuevaPagina
```

### Agregar Autenticación a Página
```tsx
import { useAuthenticator } from '@aws-amplify/ui-react'

const PaginaProtegida: NextPage = () => {
  const { user } = useAuthenticator()
  
  if (!user) {
    return <div>Necesitas iniciar sesión</div>
  }
  
  return <div>Contenido protegido</div>
}
```

### Agregar Nuevo Curso
1. Actualizar array `courses` en `admin.tsx`
2. Crear nueva página del curso en `/pages/`
3. Agregar navegación desde el dashboard

## Debugging y Troubleshooting

### Errores Comunes
- **Tailwind no carga**: Verificar `postcss.config.js` y plugin v4
- **Auth falla**: Verificar region en configuración Amplify
- **Build falla**: Revisar escapado de caracteres especiales
- **TypeScript errors**: Verificar tipado de estado React

### Comandos Útiles
```bash
npm run dev          # Desarrollo local
npm run build        # Test build completo
npm run build:config # Solo compilar next.config.ts
```

Este proyecto está configurado para ser escalable y mantenible, siguiendo las mejores prácticas de Next.js y React.