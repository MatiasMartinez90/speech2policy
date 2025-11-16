# CloudAcademy FastAPI Backend

Backend API para los asistentes de chat de cursos de CloudAcademy, powered by Amazon Bedrock.

## 🚀 Características

- **FastAPI** con autenticación JWT de Cognito
- **Amazon Bedrock** integration para chat con IA
- **Agentes especializados** por curso
- **Arquitectura modular** y escalable
- **Ready for K8s** con manifests incluidos

## 📁 Estructura

```
app/
├── main.py              # FastAPI app principal
├── config/
│   └── settings.py      # Configuración y variables de entorno
├── auth/
│   └── cognito_auth.py  # Autenticación JWT de Cognito
├── agents/
│   ├── base_agent.py    # Clase base para agentes
│   └── bedrock_agent.py # Agente para curso RAG Bedrock
├── api/
│   └── chat.py          # Endpoints de chat
└── models/
    └── chat_models.py   # Modelos Pydantic
```

## 🔧 Variables de Entorno

```bash
# AWS Cognito
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_kbBZ0w9sf
COGNITO_CLIENT_ID=7ho22jco9j63c3hmsrsp4bj0ti

# AWS Bedrock
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# AWS Credentials (preferible usar IAM roles en K8s)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# CORS
CORS_ORIGINS=https://proyectos.cloudacademy.ar,http://localhost:3000

# App
DEBUG=false
```

## 🐳 Docker

### Build
```bash
docker build -t fastapi-bedrock:latest .
```

### Run
```bash
docker run -p 8000:8000 \
  -e COGNITO_REGION=us-east-1 \
  -e COGNITO_USER_POOL_ID=us-east-1_kbBZ0w9sf \
  fastapi-bedrock:latest
```

## ☸️ Kubernetes

### Deploy
```bash
kubectl apply -f k8s/
```

### Check status
```bash
kubectl get pods -l app=fastapi-bedrock
kubectl logs -l app=fastapi-bedrock
```

## 🔗 API Endpoints

### Chat
```
POST /api/bedrock/chat
Authorization: Bearer <cognito-jwt-token>

{
  "message": "¿Cómo configuro una Knowledge Base?",
  "courseId": "bedrock-rag",
  "stepId": 1,
  "context": "Step #1 configuration",
  "history": []
}
```

### Health Check
```
GET /health
GET /api/bedrock/health
```

### Course Info
```
GET /api/bedrock/courses
GET /api/bedrock/courses/bedrock-rag/info
```

## 🧪 Testing

### Local development
```bash
# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Test endpoints
curl http://localhost:8000/health
```

### With mock responses
Si no tienes acceso a Bedrock, la aplicación usa respuestas mock inteligentes para development.

## 🔒 Seguridad

- **JWT Authentication** via Cognito
- **CORS** configurado para dominios específicos  
- **Non-root user** en contenedor Docker
- **Health checks** para K8s probes
- **Input validation** con Pydantic

## 📈 Scaling

### Horizontal scaling en K8s
```bash
kubectl scale deployment fastapi-bedrock --replicas=3
```

### Resource limits
Ver `k8s/deployment.yaml` para configuración de CPU/memoria.

## 🐛 Debugging

### Logs
```bash
kubectl logs -f deployment/fastapi-bedrock
```

### Debug mode
Set `DEBUG=true` para habilitar:
- `/docs` - Swagger UI
- `/redoc` - ReDoc
- Detailed error messages