# 🔐 Secrets Rotation Automática

**Tiempo:** 1 hora
**Costo:** $0.40/secret/mes + $0.05 per 10k requests
**Impacto:** Compliance (SOC2, ISO27001), zero-trust security

---

## 📋 ¿Qué es Secrets Rotation?

**Rotar secretos automáticamente** cada 30/60/90 días para:

✅ **Cumplir compliance** (SOC2, ISO27001, PCI-DSS)
✅ **Reducir blast radius** si un secreto se filtra
✅ **Zero-trust security** (secretos temporales)
✅ **Auditoría completa** (CloudTrail logging)

---

## 🎯 Secretos a Rotar

| Secreto | Criticidad | Rotación Recomendada | Dónde Está |
|---------|------------|----------------------|------------|
| **Bedrock API Keys** | 🔴 Alta | ❌ No necesario (IAM roles) | - |
| **Database credentials** | 🔴 Alta | ❌ No aplica (DynamoDB usa IAM) | - |
| **Cognito Client Secret** | 🟡 Media | 90 días | Secrets Manager |
| **Cognito User Pool ID** | 🟢 Baja | ❌ No secreto | SSM Parameter |
| **API Keys third-party** | 🟡 Media | 60 días | Secrets Manager |
| **JWT signing keys** | 🟡 Media | 30 días | Secrets Manager |

**En tu proyecto actual:** NO tenés secretos críticos que requieran rotación (todo usa IAM roles ✅).

---

## 🛠️ Implementación (Si Fuera Necesario)

### **Ejemplo: Rotar Cognito Client Secret**

```python
# lambdas/shared/secrets_rotation.py

import boto3
import json
from datetime import datetime, timezone

def rotate_cognito_client_secret(secret_arn):
    """
    Rota Cognito Client Secret automáticamente cada 90 días

    Steps:
    1. Create new client secret in Cognito
    2. Update Secrets Manager with new secret
    3. Test new secret works
    4. Delete old secret from Cognito
    """
    secrets_client = boto3.client('secretsmanager')
    cognito_client = boto3.client('cognito-idp')

    # Get current secret
    response = secrets_client.get_secret_value(SecretId=secret_arn)
    current_secret = json.loads(response['SecretString'])

    user_pool_id = current_secret['user_pool_id']
    client_id = current_secret['client_id']

    # Generate new client secret in Cognito
    # (Cognito no soporta rotación nativa, requiere recrear client)
    # Alternativa: Usar múltiples clients con blue/green deployment

    # 1. Create new Cognito client (blue/green)
    new_client = cognito_client.create_user_pool_client(
        UserPoolId=user_pool_id,
        ClientName=f"cloudacademy-client-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
        GenerateSecret=True,
        # ... otras configs
    )

    new_client_id = new_client['UserPoolClient']['ClientId']
    new_client_secret = new_client['UserPoolClient']['ClientSecret']

    # 2. Update Secrets Manager
    secrets_client.update_secret(
        SecretId=secret_arn,
        SecretString=json.dumps({
            'user_pool_id': user_pool_id,
            'client_id': new_client_id,
            'client_secret': new_client_secret,
            'rotated_at': datetime.now(timezone.utc).isoformat()
        })
    )

    # 3. Test new secret (simular login)
    try:
        test_response = cognito_client.initiate_auth(
            ClientId=new_client_id,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': 'test_user',
                'PASSWORD': 'test_pass',
                'SECRET_HASH': calculate_secret_hash(new_client_secret)
            }
        )
        print("✅ New secret validated successfully")
    except Exception as e:
        print(f"❌ New secret validation failed: {e}")
        # Rollback
        secrets_client.restore_secret(SecretId=secret_arn)
        return False

    # 4. Delete old Cognito client (después de confirmar que funciona)
    # Esperar 24h antes de eliminar para permitir transición
    cognito_client.delete_user_pool_client(
        UserPoolId=user_pool_id,
        ClientId=client_id
    )

    return True
```

### **Lambda de Rotación (Triggered por EventBridge)**

```hcl
# infrastructure/secrets_rotation.tf

resource "aws_lambda_function" "secrets_rotation" {
  function_name = "secrets-rotation"
  runtime       = "python3.11"
  handler       = "secrets_rotation.lambda_handler"
  role          = aws_iam_role.secrets_rotation.arn

  environment {
    variables = {
      SECRET_ARN = aws_secretsmanager_secret.cognito_client.arn
    }
  }
}

resource "aws_cloudwatch_event_rule" "rotate_secrets_schedule" {
  name                = "rotate-secrets-every-90-days"
  description         = "Trigger secrets rotation every 90 days"
  schedule_expression = "rate(90 days)"
}

resource "aws_cloudwatch_event_target" "rotate_secrets" {
  rule      = aws_cloudwatch_event_rule.rotate_secrets_schedule.name
  target_id = "SecretsRotationLambda"
  arn       = aws_lambda_function.secrets_rotation.arn
}
```

---

## 📊 Monitoring

```bash
# CloudWatch Alarm si rotación falla
aws cloudwatch put-metric-alarm \
  --alarm-name secrets-rotation-failed \
  --alarm-description "Secrets rotation failed" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 86400 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=secrets-rotation
```

---

## 💰 Costos

```
AWS Secrets Manager:
- $0.40 per secret/mes
- $0.05 per 10k API calls

Ejemplo (5 secretos, 100k calls/mes):
- Secrets: 5 × $0.40 = $2/mes
- API calls: 100k × $0.05/10k = $0.50/mes
- TOTAL: $2.50/mes
```

---

## 🎯 Recomendación

**Para tu proyecto:**

❌ **NO implementar Secrets Rotation** porque:
- Ya usás IAM roles (mejor que secretos)
- No tenés DB credentials (DynamoDB usa IAM)
- Cognito client secret no es crítico

✅ **Implementar solo si:**
- Agregás third-party APIs con API keys
- Compliance SOC2/ISO27001 lo requiere
- Usás RDS con DB password

**Alternativa mejor:** Seguir usando IAM roles para todo (current approach ✅)

---

**Última actualización:** 2025-01-14
**Status:** Documentado - NO necesario para tu stack actual
