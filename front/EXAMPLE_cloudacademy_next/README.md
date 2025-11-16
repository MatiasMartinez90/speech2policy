# Infraestructura con Terraform

Este directorio contiene la configuración de Terraform para desplegar la infraestructura necesaria para la aplicación Next.js.

## Estructura

```
terraform/
├── backend/         # Recursos de backend (Cognito, Lambda)
├── frontend/        # Recursos de frontend (S3, CloudFront)
└── modules/         # Módulos reutilizables
```

## Prerequisitos

1. AWS CLI instalado y configurado
2. Terraform instalado (versión >= 1.0.0)

## Configuración del Backend de Terraform

1. Primero, desplegar el backend de Terraform (bucket S3 y tabla DynamoDB):
```bash
# En el directorio raíz del proyecto
terraform init
terraform plan
terraform apply
```

2. Después de aplicar, Terraform mostrará los outputs con el nombre del bucket y la tabla. Usa estos valores para configurar el backend en los archivos `backend/main.tf` y `frontend/main.tf`:

```hcl
backend "s3" {
  bucket         = "<terraform_state_bucket>"  # Usar el valor del output
  key            = "backend/terraform.tfstate"  # o "frontend/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "<dynamodb_table_name>"     # Usar el valor del output
}
```

## Despliegue

### Backend

```bash
cd terraform/backend
terraform init
terraform plan
terraform apply
```

### Frontend

```bash
cd terraform/frontend
terraform init
terraform plan
terraform apply
```

## Variables de Entorno

Después de desplegar el backend, necesitarás configurar las siguientes variables de entorno en tu aplicación Next.js:

```bash
NEXT_PUBLIC_AUTH_USER_POOL_ID=<cognito_user_pool_id>
NEXT_PUBLIC_AUTH_WEB_CLIENT_ID=<cognito_user_pool_web_client_id>
```

## Limpieza

Para destruir la infraestructura:

```bash
cd terraform/frontend
terraform destroy

cd ../backend
terraform destroy

# Finalmente, destruir el backend de Terraform (¡cuidado!)
# En el directorio raíz del proyecto
terraform destroy
```

**Nota**: El bucket S3 del backend de Terraform tiene configurado `prevent_destroy = true` para evitar su eliminación accidental. Si necesitas eliminarlo, primero debes eliminar esta configuración del archivo `terraform-backend.tf`. 