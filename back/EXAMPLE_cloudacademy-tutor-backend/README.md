# 🎓 CloudAcademy - Tutor IA Multi-Curso

Sistema de tutor IA inteligente y escalable para cursos online, potenciado por Amazon Bedrock (Claude).

## 🌟 Features

- 💬 **Chat IA contextual** - Responde preguntas específicas de cada sección del curso
- ✅ **Validación de checkpoints** - Claude evalúa comprensión del estudiante
- 💡 **Sistema de pistas progresivas** - 3 niveles de ayuda sin dar la respuesta directa
- 📊 **Tracking de progreso** - Guarda avance, scores, y estadísticas por usuario
- 🏗️ **Multi-curso** - Una sola infraestructura sirve ilimitados cursos
- 🔐 **Autenticación** - Integración con Cognito (Google OAuth)

## 🏗️ Arquitectura

```
Frontend (Next.js) → API Gateway → Lambda → Bedrock (Claude) + DynamoDB
```

**Stack:**
- **Backend:** AWS Lambda (Python 3.11)
- **API:** API Gateway REST
- **Database:** DynamoDB (4 tablas)
- **IA:** Amazon Bedrock (Claude Sonnet 3.5 v2)
- **Auth:** Cognito User Pools
- **IaC:** Terraform

## 📁 Estructura del Proyecto

```
cloudacademy-tutor-backend/
├── lambdas/
│   ├── tutor-handler/       # Tutor IA principal
│   ├── courses-handler/     # CRUD de cursos
│   ├── progress-handler/    # Gestión de progreso
│   └── admin-handler/       # Panel admin
├── terraform/
│   ├── dynamodb.tf          # Tablas DynamoDB
│   ├── lambda.tf            # Funciones Lambda
│   ├── api-gateway.tf       # API Gateway
│   └── iam.tf               # Permisos IAM
├── scripts/
│   └── seed-course.py       # Seed del curso demo
├── docs/
│   └── ARCHITECTURE.md      # 📘 DOCUMENTO MAESTRO (LEER PRIMERO)
└── README.md                # Este archivo
```

## 🚀 Quick Start

### Prerrequisitos

- AWS CLI configurado
- Terraform instalado
- Python 3.11+
- Node.js 18+ (para el frontend)

### 1. Clonar el repositorio

```bash
git clone https://github.com/MatiasMartinez90/cloudacademy-tutor-backend.git
cd cloudacademy-tutor-backend
```

### 2. Deploy de infraestructura

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Esto creará:
- 4 tablas DynamoDB
- 4 funciones Lambda
- API Gateway con 8 endpoints
- Permisos IAM necesarios

### 3. Seed del curso demo

```bash
python scripts/seed-course.py
```

Esto carga el curso "Generador de Imágenes con IA" con 6 secciones.

### 4. Obtener URL del API

```bash
terraform output api_gateway_url
```

### 5. Configurar frontend

En tu proyecto Next.js, agrega la variable de entorno:

```bash
# .env.local
NEXT_PUBLIC_TUTOR_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod
```

## 📖 Documentación

**⚠️ IMPORTANTE:** Antes de empezar a programar, lee el documento maestro:

### [📘 ARCHITECTURE.md](./docs/ARCHITECTURE.md)

Este documento contiene:
- ✅ Arquitectura completa detallada
- ✅ Modelo de datos DynamoDB (con ejemplos reales)
- ✅ Especificación de API (todos los endpoints)
- ✅ Plan de implementación por fases
- ✅ Decisiones de arquitectura
- ✅ Troubleshooting
- ✅ Costos estimados

**Es el documento que debes consultar si:**
- Pierdes el contexto de la conversación
- Necesitas retomar el proyecto
- Quieres entender cómo funciona todo
- Necesitas hacer debugging

## 🔑 Endpoints del API

### Públicos (Sin autenticación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/courses` | Listar cursos publicados |
| GET | `/api/courses/{id}` | Detalle de curso con secciones |
| OPTIONS | `/api/courses` | CORS preflight |
| OPTIONS | `/api/courses/{id}` | CORS preflight |

### Protegidos (Requieren JWT)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/api/tutor/ask` | Pregunta libre al tutor | User |
| POST | `/api/tutor/validate` | Validar respuesta de checkpoint | User |
| GET | `/api/tutor/hint` | Solicitar pista (nivel 1-3) | User |
| GET | `/api/tutor/progress` | Obtener progreso del usuario | User |
| POST | `/api/admin/courses` | Crear curso | Admin |
| PUT | `/api/admin/courses/{id}` | Actualizar curso | Admin |
| DELETE | `/api/admin/courses/{id}` | Eliminar curso | Admin |
| OPTIONS | `/api/admin/courses` | CORS preflight | None |
| OPTIONS | `/api/admin/courses/{id}` | CORS preflight | None |

## 💾 Tablas DynamoDB

### CourseCatalog
- Metadata de cursos
- Secciones con contenido
- Checkpoints y criterios de validación

### UserProgress
- Progreso por usuario y curso
- Scores de checkpoints
- Estadísticas de uso

### TutorSessions
- Historial de conversaciones
- TTL: 30 días

### UserUsage
- Rate limiting por usuario
- Contadores de uso (anónimos: 1 total, autenticados: 50/día)
- TTL: 7 días

## 🎯 Curso Demo: "Generador de Imágenes con IA"

El proyecto incluye un curso completo sobre cómo construir un API que genera imágenes usando:
- API Gateway
- Lambda (Python)
- Amazon Bedrock (Titan Image Generator)
- S3

**6 secciones:**
0. Introducción
1. Configurar Lambda
2. Amazon Bedrock
3. S3 Storage
4. API Gateway Setup
5. Testing & Debugging

Cada sección tiene:
- Contenido didáctico
- Objetivos de aprendizaje
- Pasos detallados
- Checkpoint de validación
- 3 niveles de pistas

## 💰 Costos Estimados

Para 100 usuarios activos/mes:
- DynamoDB: ~$1.38
- Lambda: ~$5.20
- API Gateway: ~$0.35
- Bedrock (Claude): ~$67.50
- Otros: ~$1.12

**Total: ~$75.57/mes** ($0.76 por usuario)

## 🔒 Seguridad

- ✅ Autenticación con Cognito JWT
- ✅ Autorización a nivel de API Gateway
- ✅ Grupos de permisos (Admin vs User)
- ✅ Encryption en DynamoDB
- ✅ Buckets S3 privados

## 📊 Monitoring

Logs en CloudWatch:
- Requests de API
- Invocaciones de Lambda
- Respuestas de Bedrock
- Errores y latencias

Métricas clave:
- `Lambda Invocations`
- `API Gateway 4XX/5XX Errors`
- `DynamoDB Consumed Capacity`
- `Bedrock Token Usage`

## 🐛 Troubleshooting

### Lambda timeout
```bash
# Aumentar timeout
aws lambda update-function-configuration \
  --function-name tutor-handler \
  --timeout 60
```

### CORS errors
Verificar que método OPTIONS existe y headers están configurados en API Gateway.

### 401 Unauthorized
Verificar token JWT:
```javascript
const session = await fetchAuthSession()
const token = session.tokens.idToken.toString()
```

Ver más en [ARCHITECTURE.md - Troubleshooting](./docs/ARCHITECTURE.md#-troubleshooting)

## 🧪 Testing

```bash
# Test Lambda directo
aws lambda invoke \
  --function-name tutor-handler \
  --payload '{"httpMethod":"POST","path":"/api/tutor/ask","body":"..."}' \
  response.json

# Test API Gateway (requiere token)
curl -X POST "https://xxx.execute-api.us-east-1.amazonaws.com/prod/api/tutor/ask" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_id":"image-gen-bedrock","section_id":0,"question":"test"}'
```

## 📝 Plan de Implementación

El proyecto se divide en 9 fases (ver [ARCHITECTURE.md](./docs/ARCHITECTURE.md#-plan-de-implementación-por-etapas)):

1. ✅ **Setup Inicial** (1-2h) - COMPLETADO
2. ✅ **DynamoDB Tables** (2-3h) - COMPLETADO
3. ✅ **Lambda tutor-handler** (4-6h) - COMPLETADO
4. ✅ **Lambdas de soporte** (2-3h) - COMPLETADO
5. ✅ **API Gateway** (3-4h) - COMPLETADO
6. ✅ **Integración Frontend** (1-2h) - COMPLETADO
7. ✅ **Admin Panel** (2-3h) - COMPLETADO
8. ✅ **Catálogo Público + Metadata** (4h) - COMPLETADO
9. ⏳ **Editor de Steps (Fase 2)** (19h) - EN PROGRESO (35% completado)
   - ✅ Parte 1: Backend Infrastructure (S3 + Lambdas) - COMPLETADO
   - ⏳ Parte 2: API Gateway Endpoints - PENDIENTE
   - ⏳ Parte 3: Frontend (Sections Page + Editor) - PENDIENTE

**Total estimado:** 41-48 horas
**Completado:** 25-33 horas (8.35 fases)
**Progreso:** 90% ✅

🎉 **Proyecto Core 100% Completo!**
🚀 **Backend + Frontend + Admin Panel + Catálogo totalmente funcional!**
⏳ **En Progreso:** Editor de contenido de secciones (Fase 2)
  - ✅ S3 Bucket para imágenes
  - ✅ Lambda upload-handler (presigned URLs)
  - ✅ Lambda sections-handler (CRUD)
  - ⏳ API Gateway endpoints
  - ⏳ Frontend components

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -am 'Add nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

## 📞 Contacto

**Desarrollador:** Matias Martinez
**Email:** matias@cloudacademy.ar
**GitHub:** [@MatiasMartinez90](https://github.com/MatiasMartinez90)

## 📄 Licencia

Este proyecto es privado y propiedad de CloudAcademy.

---

**⚡ Tip:** Si perdiste el contexto, lee [ARCHITECTURE.md](./docs/ARCHITECTURE.md). Contiene TODO lo que necesitas saber.

**🚀 Ready to start?** Ve a la Fase 1 del plan de implementación en ARCHITECTURE.md
