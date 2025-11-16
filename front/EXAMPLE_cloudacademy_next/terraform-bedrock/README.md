# Terraform Bedrock Configuration

Este módulo de Terraform configura los permisos IAM necesarios para que tu FastAPI pueda acceder a Amazon Bedrock.

## Recursos Creados

### IAM Resources
- **IAM Role**: `fastapi-bedrock-role` - Para uso con EC2 instances
- **IAM User**: `fastapi-bedrock-user` - Para uso con access keys
- **IAM Policy**: `bedrock-access-policy` - Permisos específicos para Bedrock
- **Access Keys**: Credenciales para el usuario IAM

### SSM Parameters
- `/cloudacademy/bedrock/access_key_id` - Access Key ID (SecureString)
- `/cloudacademy/bedrock/secret_access_key` - Secret Access Key (SecureString)

## Modelos Permitidos

Por defecto, se permite acceso a estos modelos de Bedrock:
- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-instant-v1`
- `anthropic.claude-v2`

## Deployment

### 1. Inicializar Terraform
```bash
cd terraform-bedrock
terraform init
```

### 2. Planificar cambios
```bash
terraform plan
```

### 3. Aplicar configuración
```bash
terraform apply
```

### 4. Obtener credenciales
```bash
# Ver Access Key ID
terraform output access_key_id

# Ver Secret Access Key
terraform output secret_access_key
```

## Uso en FastAPI

### Opción 1: Variables de entorno
```bash
export AWS_ACCESS_KEY_ID=$(terraform output -raw access_key_id)
export AWS_SECRET_ACCESS_KEY=$(terraform output -raw secret_access_key)
```

### Opción 2: Kubernetes Secret
```bash
kubectl create secret generic fastapi-bedrock-secrets \
  --namespace=cloudacademy \
  --from-literal=AWS_ACCESS_KEY_ID=$(terraform output -raw access_key_id) \
  --from-literal=AWS_SECRET_ACCESS_KEY=$(terraform output -raw secret_access_key)
```

### Opción 3: AWS Systems Manager
Las credenciales están automáticamente almacenadas en SSM Parameter Store:
- `/cloudacademy/bedrock/access_key_id`
- `/cloudacademy/bedrock/secret_access_key`

## Seguridad

- ✅ Principio de menor privilegio - Solo permisos necesarios para Bedrock
- ✅ Credenciales almacenadas como SecureString en SSM
- ✅ Recursos etiquetados para auditoría
- ✅ Backend remoto S3 para state file

## Troubleshooting

### Error: "Access Denied" en Bedrock
1. Verificar que el modelo esté en la lista `bedrock_models`
2. Confirmar que las credenciales sean correctas
3. Verificar que Bedrock esté habilitado en tu región

### Error: "Model not found"
1. Verificar que el modelo esté disponible en `us-east-1`
2. Algunos modelos requieren solicitar acceso en la consola AWS

## Cleanup

Para eliminar todos los recursos:
```bash
terraform destroy
```

**⚠️ Atención**: Esto eliminará las credenciales y permisos IAM.