# Migración PostgreSQL → DynamoDB

## Fecha: 2025-11-06

### Cambios Realizados

#### Lambda PostConfirmation
- ✅ Migrada de PostgreSQL a DynamoDB
- ✅ Eliminada dependencia de webhook FastAPI
- ✅ Escritura directa a tabla `Users` en DynamoDB

#### Tabla Users (DynamoDB)
- **Nombre:** Users
- **PK:** USER#{cognito_user_id}
- **SK:** PROFILE
- **GSI:** email-index
- **Región:** us-east-1
- **ARN:** arn:aws:dynamodb:us-east-1:982081083386:table/Users

#### Permisos IAM
- ✅ Lambda tiene permisos para `dynamodb:PutItem` y `dynamodb:GetItem`
- ✅ Eliminados permisos VPC (ya no se necesita acceso a RDS)

#### Variables Eliminadas
- ❌ DB_HOST
- ❌ DB_NAME
- ❌ DB_USER
- ❌ DB_PASSWORD
- ❌ DB_PORT

#### Variables Mantenidas
- ✅ FROM_EMAIL (para SES)
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET

### Arquitectura Nueva

```
Cognito PostConfirmation Trigger
         ↓
Lambda (postConfirmation.py)
         ↓
DynamoDB Table: Users
         ↓
Item creado con perfil de usuario
```

### Testing

Después del deploy, verificar:

1. **Crear usuario nuevo:**
   - Google OAuth en https://proyectos.cloudacademy.ar/signin
   - O Email/Password signup

2. **Verificar DynamoDB:**
   ```bash
   aws dynamodb scan --table-name Users --limit 5
   ```

3. **Revisar logs Lambda:**
   ```bash
   aws logs tail /aws/lambda/cloudacademy-prod-post-confirmation-* --follow
   ```

### Rollback (si es necesario)

Si hay problemas, revertir a commit anterior:
```bash
git revert HEAD
git push origin agent-fusion
```

### Deprecación Futura

Cuando sea seguro:
- Eliminar webhook FastAPI endpoint `/cognito-register`
- Considerar eliminar PostgreSQL RDS si no se usa para nada más
- Eliminar secrets de GitHub: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
