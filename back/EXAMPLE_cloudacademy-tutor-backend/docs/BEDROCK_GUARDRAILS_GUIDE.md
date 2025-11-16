# 🛡️ Bedrock Guardrails - Migración desde Validación Custom

**Proyecto:** CloudAcademy Tutor Backend
**Fecha:** 2025-01-14
**Status:** 📋 Documentado (Ready para implementar)

---

## 📋 ¿Qué son Bedrock Guardrails?

Bedrock Guardrails es un servicio nativo de AWS que reemplaza validaciones custom con:
- ✅ **Blocked topics** automático (política, religión, violencia, etc.)
- ✅ **Content filters** (hate, insults, sexual, violence, misconduct)
- ✅ **PII redaction** (emails, phones, SSN, credit cards)
- ✅ **Word filters** custom (spam patterns, URLs)
- ✅ **Contextual grounding** (reduce alucinaciones)

**Ventajas vs Código Custom:**
- Menos código a mantener (elimina `content_validator.py`)
- Mejores detecciones (ML models de AWS)
- Menor latencia (nativo en Bedrock)
- Actualizaciones automáticas

**Costo:** $0.01 por 1000 invocaciones (muy bajo para POC)

---

## 🎯 Migración: De Custom a Guardrails

### **Código Actual (lambdas/tutor-handler/validators/content_validator.py):**

```python
class ContentValidator:
    BLOCKED_TOPICS = ['trump', 'biden', 'dios', 'jesús', ...]
    SPAM_PATTERNS = [r'https?://[^\s]+', r'\d{3}[-.]?\d{3}']

    def validate_question(self, question, course_id):
        # Verificar temas bloqueados
        for topic in self.BLOCKED_TOPICS:
            if topic in question_lower:
                return {'valid': False, 'reason': 'blocked_topic'}

        # Verificar spam patterns
        for pattern in self.SPAM_PATTERNS:
            if re.search(pattern, question):
                return {'valid': False, 'reason': 'spam'}

        return {'valid': True}
```

**Problemas:**
- ❌ Lista manual de palabras (limitada)
- ❌ Regex patterns (falsos positivos/negativos)
- ❌ No detecta toxicidad/hate speech
- ❌ No detecta PII
- ❌ Código a mantener

---

### **Con Bedrock Guardrails:**

```python
# EN bedrock_client.py
def invoke_with_question(self, system_prompt, user_question, ...):
    response = self.client.converse(
        modelId=self.model_id,
        messages=[...],
        inferenceConfig={...},

        # ✅ Agregar Guardrails aquí
        guardrailConfig={
            'guardrailIdentifier': 'cloudacademy-tutor-guardrail',
            'guardrailVersion': 'DRAFT',  # o número de versión
            'trace': 'enabled'  # Para debugging
        }
    )

    # Si hay trace, revisar intervenciones
    if 'trace' in response:
        trace = response['trace']
        if 'guardrailTrace' in trace:
            interventions = trace['guardrailTrace'].get('interventions', [])
            if interventions:
                # Guardrail bloqueó el content
                logger.warning(f"Guardrail blocked content: {interventions}")
                return {
                    'blocked': True,
                    'reason': interventions[0]['type'],
                    'message': '🚫 Tu mensaje contiene contenido no permitido...'
                }

    return response
```

**Beneficios:**
- ✅ Detecciones ML-powered (mejor precisión)
- ✅ PII redaction automático
- ✅ Menos código (AWS maneja la lógica)
- ✅ Actualizaciones automáticas

---

## 🏗️ Crear Guardrail en AWS Console

### **Paso 1: Ir a Bedrock Console**

1. Ir a **Amazon Bedrock** → **Guardrails**
2. Click **Create guardrail**
3. Name: `cloudacademy-tutor-guardrail`
4. Description: `Content filtering for CloudAcademy tutor`

---

### **Paso 2: Configurar Content Filters**

**Filters a habilitar:**

| Filter | Threshold | Propósito |
|--------|-----------|-----------|
| **Hate** | Medium | Bloquea hate speech |
| **Insults** | Medium | Bloquea insultos |
| **Sexual** | High | Bloquea contenido sexual |
| **Violence** | Medium | Bloquea violencia |
| **Misconduct** | Low | Bloquea contenido inapropiado general |

**Configuración:**
```json
{
  "contentFiltersConfig": [
    {
      "type": "HATE",
      "inputStrength": "MEDIUM",
      "outputStrength": "NONE"
    },
    {
      "type": "INSULTS",
      "inputStrength": "MEDIUM",
      "outputStrength": "NONE"
    },
    {
      "type": "SEXUAL",
      "inputStrength": "HIGH",
      "outputStrength": "NONE"
    },
    {
      "type": "VIOLENCE",
      "inputStrength": "MEDIUM",
      "outputStrength": "NONE"
    },
    {
      "type": "MISCONDUCT",
      "inputStrength": "LOW",
      "outputStrength": "NONE"
    }
  ]
}
```

**Nota:** Solo filtramos INPUT (preguntas del usuario), no OUTPUT (respuestas de Claude)

---

### **Paso 3: Configurar Blocked Topics**

**Topics a bloquear:**
```json
{
  "topicsConfig": [
    {
      "name": "Politics",
      "definition": "Political topics, elections, candidates, parties, government policies",
      "examples": ["Who should I vote for?", "Is Trump better than Biden?"],
      "type": "DENY"
    },
    {
      "name": "Religion",
      "definition": "Religious topics, beliefs, gods, churches, sacred texts",
      "examples": ["Is God real?", "Which religion is correct?"],
      "type": "DENY"
    },
    {
      "name": "Medical_Advice",
      "definition": "Medical diagnoses, treatments, medications, health advice",
      "examples": ["I have cancer, what should I do?", "Which medicine should I take?"],
      "type": "DENY"
    },
    {
      "name": "Legal_Advice",
      "definition": "Legal advice, lawsuits, contracts, legal interpretations",
      "examples": ["Can I sue my employer?", "Is this contract valid?"],
      "type": "DENY"
    },
    {
      "name": "Financial_Investment",
      "definition": "Investment advice, stock trading, cryptocurrency, financial planning",
      "examples": ["Should I buy Bitcoin?", "Which stocks to invest in?"],
      "type": "DENY"
    }
  ]
}
```

---

### **Paso 4: Configurar Sensitive Information (PII Redaction)**

**PII types a redactar:**

```json
{
  "sensitiveInformationPolicyConfig": {
    "piiEntitiesConfig": [
      {
        "type": "EMAIL",
        "action": "BLOCK"
      },
      {
        "type": "PHONE",
        "action": "BLOCK"
      },
      {
        "type": "URL",
        "action": "BLOCK"
      },
      {
        "type": "CREDIT_DEBIT_CARD_NUMBER",
        "action": "BLOCK"
      },
      {
        "type": "US_SOCIAL_SECURITY_NUMBER",
        "action": "ANONYMIZE"
      }
    ]
  }
}
```

**Acciones:**
- **BLOCK:** Rechaza completamente el request
- **ANONYMIZE:** Reemplaza con `[EMAIL]`, `[PHONE]`, etc.

---

### **Paso 5: Configurar Word Filters (Custom)**

**Palabras/patrones a bloquear:**

```json
{
  "wordPolicyConfig": {
    "wordsConfig": [
      {
        "text": "spam"
      },
      {
        "text": "compra ahora"
      },
      {
        "text": "oferta gratis"
      },
      {
        "text": "descuento especial"
      }
    ],
    "managedWordListsConfig": [
      {
        "type": "PROFANITY"  # AWS managed profanity list
      }
    ]
  }
}
```

---

### **Paso 6: Crear y Activar Guardrail**

1. Review configuration
2. Click **Create guardrail**
3. Esperar ~2 min (AWS está creando el guardrail)
4. **Guardrail ID:** `abc123def456` (copiar este ID)
5. **Version:** DRAFT (o crear versión estable)

---

## 📝 Implementación en Código

### **Paso 1: Modificar bedrock_client.py**

```python
# lambdas/tutor-handler/utils/bedrock_client.py

import os
from shared.config_manager import get_config

class BedrockClient:
    def __init__(self, model_id=None, region=None, guardrail_id=None):
        # ... código existente ...

        # Obtener Guardrail ID desde env var o parameter
        self.guardrail_id = guardrail_id or get_config(
            'BEDROCK_GUARDRAIL_ID',
            default=None,
            required=False
        )

        self.guardrail_version = get_config(
            'BEDROCK_GUARDRAIL_VERSION',
            default='DRAFT',
            required=False
        )

    def invoke_with_question(self, system_prompt, user_question, ...):
        """Invocar Bedrock con guardrails habilitados"""

        # Construir config base
        inference_config = {
            'maxTokens': max_tokens,
            'temperature': temperature
        }

        # Agregar guardrail si está configurado
        guardrail_config = None
        if self.guardrail_id:
            guardrail_config = {
                'guardrailIdentifier': self.guardrail_id,
                'guardrailVersion': self.guardrail_version,
                'trace': 'enabled'  # Para ver qué bloqueó
            }

            logger.info(f"Using guardrail: {self.guardrail_id}")

        try:
            response = self.client.converse(
                modelId=self.model_id,
                messages=[{
                    'role': 'user',
                    'content': [{'text': user_question}]
                }],
                system=[{'text': system_prompt}],
                inferenceConfig=inference_config,
                guardrailConfig=guardrail_config  # ✅ Agregar aquí
            )

            # ✅ Verificar si guardrail bloqueó
            if guardrail_config and 'trace' in response:
                interventions = response.get('trace', {}) \
                    .get('guardrailTrace', {}) \
                    .get('action', None)

                if interventions == 'INTERVENED':
                    # Guardrail bloqueó el content
                    trace_details = response['trace']['guardrailTrace']

                    logger.warning(f"Guardrail intervened: {trace_details}")

                    return {
                        'success': False,
                        'blocked_by_guardrail': True,
                        'reason': self._extract_block_reason(trace_details),
                        'message': self._get_guardrail_rejection_message(trace_details)
                    }

            # Response normal
            return {
                'success': True,
                'response_text': response['output']['message']['content'][0]['text'],
                'usage': {
                    'input_tokens': response['usage']['inputTokens'],
                    'output_tokens': response['usage']['outputTokens']
                }
            }

        except ClientError as e:
            # Manejar errores...
            pass

    def _extract_block_reason(self, trace_details):
        """Extraer razón del bloqueo del trace"""
        # Analizar trace para determinar qué rule bloqueó
        # topic_policy, content_filter, word_filter, sensitive_information

        for assessment in trace_details.get('inputAssessments', []):
            if assessment.get('topicPolicy'):
                for topic in assessment['topicPolicy'].get('topics', []):
                    if topic.get('action') == 'BLOCKED':
                        return f"blocked_topic:{topic['name']}"

            if assessment.get('contentPolicy'):
                for filter in assessment['contentPolicy'].get('filters', []):
                    if filter.get('action') == 'BLOCKED':
                        return f"content_filter:{filter['type']}"

            if assessment.get('wordPolicy'):
                return "word_filter:blocked"

            if assessment.get('sensitiveInformationPolicy'):
                for pii in assessment['sensitiveInformationPolicy'].get('piiEntities', []):
                    if pii.get('action') == 'BLOCKED':
                        return f"pii_blocked:{pii['type']}"

        return "unknown_block"

    def _get_guardrail_rejection_message(self, trace_details):
        """Mensaje amigable según el tipo de bloqueo"""
        reason = self._extract_block_reason(trace_details)

        if 'blocked_topic' in reason:
            return """🤔 Tu pregunta parece estar fuera del alcance del curso.

Este tutor está especializado en AWS y cloud computing.

¿Hay algo sobre los servicios AWS del curso que te gustaría aprender?"""

        elif 'content_filter' in reason:
            return """⚠️ Tu mensaje contiene contenido inapropiado.

Por favor, mantén tus preguntas relacionadas al curso de manera respetuosa."""

        elif 'word_filter' in reason:
            return """⚠️ Tu mensaje contiene palabras no permitidas.

Por favor, reformula tu pregunta sin spam o contenido comercial."""

        elif 'pii_blocked' in reason:
            return """⚠️ Tu mensaje contiene información personal (email, teléfono, etc.).

Por favor, no compartas información personal en tus preguntas."""

        else:
            return """🚫 Tu mensaje fue bloqueado por nuestros filtros de seguridad.

Por favor, reformula tu pregunta de manera apropiada."""
```

---

### **Paso 2: Agregar Variables de Entorno**

```bash
# Lambda environment variables
BEDROCK_GUARDRAIL_ID=abc123def456  # ID del guardrail creado
BEDROCK_GUARDRAIL_VERSION=DRAFT    # O número de versión (1, 2, etc.)
```

O usando Parameter Store:
```bash
aws ssm put-parameter \
  --name "/cloudacademy/bedrock/guardrail-id" \
  --value "abc123def456" \
  --type String
```

---

### **Paso 3: Deprecar content_validator.py (Gradual)**

**Opción A: Reemplazar completamente**

```python
# EN lambda_function.py

# ❌ ANTES
from validators.content_validator import ContentValidator
validator = ContentValidator()
validation = validator.validate_question(question, course_id)
if not validation['valid']:
    return error_response(400, validation['rejection_message'])

# ✅ DESPUÉS
# La validación ahora está en bedrock_client con guardrails
response = bedrock_client.invoke_with_question(...)
if response.get('blocked_by_guardrail'):
    return error_response(400, response['message'])
```

**Opción B: Dual mode (transición)**

```python
# Usar guardrails si está configurado, sino fallback a validator custom
if bedrock_client.guardrail_id:
    # Modo nuevo: Bedrock Guardrails
    logger.info("Using Bedrock Guardrails for validation")
    response = bedrock_client.invoke_with_question(...)

    if response.get('blocked_by_guardrail'):
        return error_response(400, response['message'])
else:
    # Modo legacy: Validator custom
    logger.info("Using custom validator (legacy mode)")
    validator = ContentValidator()
    validation = validator.validate_question(question, course_id)

    if not validation['valid']:
        return error_response(400, validation['rejection_message'])

    response = bedrock_client.invoke_with_question(...)
```

---

## 🧪 Testing de Guardrails

### **Test 1: Blocked Topic (Política)**

```bash
curl -X POST https://api.cloudacademy.com/api/tutor/ask \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "image-gen-bedrock",
    "section_id": 1,
    "message_type": "question",
    "content": "Who should I vote for in the election?"
  }'

# Expected:
# HTTP 400
# {
#   "error": "🤔 Tu pregunta parece estar fuera del alcance del curso..."
# }
```

### **Test 2: PII Blocked (Email)**

```bash
curl -X POST ... \
  -d '{
    "content": "My email is user@example.com, can you help me?"
  }'

# Expected:
# HTTP 400
# {
#   "error": "⚠️ Tu mensaje contiene información personal..."
# }
```

### **Test 3: Content Filter (Hate Speech)**

```bash
curl -X POST ... \
  -d '{
    "content": "I hate [group]..."
  }'

# Expected:
# HTTP 400
# {
#   "error": "⚠️ Tu mensaje contiene contenido inapropiado..."
# }
```

### **Test 4: Valid Question (Should Pass)**

```bash
curl -X POST ... \
  -d '{
    "content": "How does Lambda integrate with API Gateway?"
  }'

# Expected:
# HTTP 200
# {
#   "response": "Lambda integrates with API Gateway by..."
# }
```

---

## 📊 Monitoring de Guardrails

### **CloudWatch Logs**

Buscar intervenciones:
```
fields @timestamp, guardrailTrace.action, @message
| filter guardrailTrace.action = "INTERVENED"
| sort @timestamp desc
| limit 100
```

### **CloudWatch Metrics**

Crear métricas custom:
```python
from aws_lambda_powertools import Metrics

metrics = Metrics(service="tutor-handler")

# Cuando guardrail bloquea
if response.get('blocked_by_guardrail'):
    metrics.add_metric(
        name="GuardrailBlocked",
        unit="Count",
        value=1
    )
    metrics.add_dimension(name="Reason", value=response['reason'])
```

Dashboard:
- `GuardrailBlocked` por tipo (topic, pii, content_filter)
- Ratio bloqueados vs aceptados
- Top blocked topics

---

## 💰 Costos Estimados

| Volumen | Guardrail Invocations | Costo/mes |
|---------|----------------------|-----------|
| POC (1K req/mes) | 1,000 | $0.01 |
| Staging (10K req/mes) | 10,000 | $0.10 |
| Producción (100K req/mes) | 100,000 | $1.00 |

**Nota:** Muy bajo costo vs mantener código custom

---

## 🔄 Plan de Migración

### **Fase 1: Setup (2h)**
1. Crear guardrail en Bedrock Console
2. Configurar content filters, topics, PII
3. Testear con ejemplos en Console

### **Fase 2: Implementación (4h)**
4. Modificar `bedrock_client.py` con guardrail support
5. Agregar env vars `BEDROCK_GUARDRAIL_ID`
6. Deploy en staging

### **Fase 3: Testing (2h)**
7. Testear todos los casos de bloqueo
8. Ajustar thresholds si hay falsos positivos
9. Verificar mensajes de error son amigables

### **Fase 4: Production (1h)**
10. Deploy en producción
11. Monitorear metrics
12. Deprecar `content_validator.py` (opcional)

---

## 📚 Referencias

- [Bedrock Guardrails Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [Guardrails API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_Guardrail.html)
- [Content Filters](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-content-filters.html)
- [Pricing](https://aws.amazon.com/bedrock/pricing/)

---

## ✅ Checklist de Implementación

- [ ] Crear guardrail en Bedrock Console
- [ ] Configurar content filters (hate, insults, sexual, violence)
- [ ] Configurar blocked topics (politics, religion, medical, legal)
- [ ] Configurar PII redaction (email, phone, URL)
- [ ] (Opcional) Configurar word filters custom
- [ ] Obtener Guardrail ID
- [ ] Agregar env vars a Lambda
- [ ] Modificar `bedrock_client.py` con guardrail support
- [ ] Testear blocked topics funciona
- [ ] Testear PII blocking funciona
- [ ] Testear content filters funcionan
- [ ] Configurar CloudWatch metrics
- [ ] Deploy en staging
- [ ] Testear end-to-end
- [ ] Deploy en producción
- [ ] (Opcional) Deprecar `content_validator.py`

---

**Última actualización:** 2025-01-14
**Branch:** `claude/code-analysis-0152xQj5zizLxUAeo9P9WaFU`
**Status:** 📋 Ready para implementar
**Costo:** $0.01 por 1000 requests (~$1/mes para producción)
**Impacto:** Menos código, mejor seguridad, actualizaciones automáticas
