# 📦 Guía de Implementación: Lambda Layers

**Tiempo estimado:** 2-3 horas
**Dificultad:** 🟡 Media
**Prioridad:** ⭐⭐ Media (Optimización cold start)

---

## 📋 ¿Qué vamos a implementar?

Vamos a separar las **dependencies** y el **módulo shared/** en Lambda Layers para:
1. Reducir el tamaño de los deployment packages
2. Reducir cold start time (-80%: 3-5s → 500ms)
3. Reutilizar código entre lambdas
4. Deployments más rápidos

---

## 🎯 Beneficios

### **ANTES (sin layers):**
- ❌ Cada lambda incluye sus propias dependencies (boto3, aws-lambda-powertools)
- ❌ Deployment package grande (~30MB por lambda)
- ❌ Cold start lento (3-5 segundos)
- ❌ Actualizar shared/ requiere redeploy de 7 lambdas

### **DESPUÉS (con layers):**
- ✅ Dependencies compartidas en 1 layer
- ✅ Módulo shared/ en otro layer
- ✅ Deployment package pequeño (~5KB código puro)
- ✅ Cold start rápido (500ms)
- ✅ Actualizar shared/ → redeploy solo el layer

---

## 📊 Arquitectura de Layers

```
Layer 1: cloudacademy-dependencies (30MB)
├── boto3==1.34.162
├── botocore==1.34.162
└── aws-lambda-powertools==2.32.0

Layer 2: cloudacademy-shared-code (50KB)
└── shared/
    ├── response_utils.py
    ├── boto3_config.py
    ├── validators.py
    └── ...

Lambda (5KB) - Solo código específico del lambda
├── lambda_function.py
└── utils/ (si tiene)
```

---

## ✅ Pre-requisitos

- [x] Scripts de build ya existen (`scripts/build_layers.sh`, `scripts/deploy_layers.sh`)
- [ ] Docker instalado (para build consistente)
- [ ] AWS CLI configurado

---

## 🚀 Paso a Paso - Implementación

### **Paso 1: Revisar Scripts Existentes (5 min)**

Ya tienes los scripts listos:

```bash
ls -la scripts/
# build_layers.sh   - Construye los layers
# deploy_layers.sh  - Sube a AWS
```

---

### **Paso 2: Build de Layers (10 min)**

```bash
cd /path/to/cloudacademy-tutor-backend

# Build ambos layers
chmod +x scripts/build_layers.sh
./scripts/build_layers.sh
```

**Qué hace el script:**
1. Crea `layers/dependencies/python/` con pip install
2. Crea `layers/shared-code/python/shared/` copiando lambdas/shared/
3. Genera ZIPs: `dependencies-layer.zip`, `shared-code-layer.zip`

**Output esperado:**
```
✅ Dependencies layer creado: dependencies-layer.zip (30MB)
✅ Shared code layer creado: shared-code-layer.zip (50KB)
```

---

### **Paso 3: Deploy Layers a AWS (5 min)**

```bash
./scripts/deploy_layers.sh
```

**Qué hace el script:**
1. Sube `dependencies-layer.zip` como layer `cloudacademy-dependencies`
2. Sube `shared-code-layer.zip` como layer `cloudacademy-shared-code`
3. Retorna ARNs de los layers

**Output esperado:**
```
✅ Layer cloudacademy-dependencies v1 creado
   ARN: arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-dependencies:1

✅ Layer cloudacademy-shared-code v1 creado
   ARN: arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-shared-code:1
```

**IMPORTANTE:** Copia los ARNs, los necesitarás en el siguiente paso.

---

### **Paso 4: Actualizar Terraform para Usar Layers (15 min)**

Editar `terraform/lambda.tf`:

```hcl
# Variables para Layer ARNs
variable "dependencies_layer_arn" {
  description = "ARN del layer de dependencies"
  type        = string
  default     = "arn:aws:lambda:us-east-1:ACCOUNT_ID:layer:cloudacademy-dependencies:1"
}

variable "shared_code_layer_arn" {
  description = "ARN del layer de shared code"
  type        = string
  default     = "arn:aws:lambda:us-east-1:ACCOUNT_ID:layer:cloudacademy-shared-code:1"
}

# Actualizar cada lambda para usar layers
resource "aws_lambda_function" "courses_handler" {
  # ... config existente ...

  # Agregar layers
  layers = [
    var.dependencies_layer_arn,
    var.shared_code_layer_arn
  ]

  # IMPORTANTE: Ahora el ZIP solo tiene lambda_function.py
  # (sin dependencies ni shared/)
}

# Repetir para todos los lambdas
```

---

### **Paso 5: Re-empaquetar Lambdas sin Dependencies (15 min)**

Modificar `scripts/package-lambdas.sh`:

```bash
# ANTES: Incluía shared/
rsync -a --exclude='__pycache__' \
     --exclude='*.pyc' \
     "$lambda_dir/" "$temp_dir/"
cp -r "$LAMBDAS_DIR/shared" "$temp_dir/"

# DESPUÉS: NO incluir shared/ (viene del layer)
rsync -a --exclude='__pycache__' \
     --exclude='*.pyc' \
     --exclude='shared' \
     "$lambda_dir/" "$temp_dir/"
# NO copiar shared/ - viene del layer
```

**IMPORTANTE:** También remover `requirements.txt` de los ZIPs (dependencies vienen del layer).

Re-empaquetar:
```bash
./scripts/package-lambdas.sh
```

**Resultado:** ZIPs ahora son ~5KB en lugar de ~30KB.

---

### **Paso 6: Deploy Actualizado (10 min)**

```bash
# Terraform apply para actualizar layers en lambdas
cd terraform
terraform apply

# O deploy directo con AWS CLI
for lambda in courses-handler tutor-handler admin-handler categories-handler progress-handler sections-handler upload-handler; do
  aws lambda update-function-code \
    --function-name cloudacademy-$lambda \
    --zip-file fileb://lambdas/$lambda.zip

  # Agregar layers
  aws lambda update-function-configuration \
    --function-name cloudacademy-$lambda \
    --layers \
      arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-dependencies:1 \
      arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-shared-code:1
done
```

---

## 🧪 Testing - Verificar que Funciona

### **Test 1: Verificar Layers en Lambda**

```bash
aws lambda get-function-configuration \
  --function-name cloudacademy-courses-handler \
  | jq '.Layers'
```

**Output esperado:**
```json
[
  {
    "Arn": "arn:aws:lambda:us-east-1:XXX:layer:cloudacademy-dependencies:1",
    "CodeSize": 30000000
  },
  {
    "Arn": "arn:aws:lambda:us-east-1:XXX:layer:cloudacademy-shared-code:1",
    "CodeSize": 50000
  }
]
```

---

### **Test 2: Verificar Cold Start Mejorado**

**Medir ANTES (sin layers):**
```bash
# Forzar cold start (esperar 15 min sin llamadas)
time curl https://API_URL/prod/api/courses
```

**Resultado esperado ANTES:** 3-5 segundos

**Medir DESPUÉS (con layers):**
```bash
# Forzar cold start nuevamente
time curl https://API_URL/prod/api/courses
```

**Resultado esperado DESPUÉS:** 0.5-1 segundo ✅

---

### **Test 3: Funcionalidad**

Probar todos los endpoints:
```bash
# Courses
curl https://API_URL/prod/api/courses

# Tutor
curl -X POST https://API_URL/prod/api/tutor/ask \
  -H "Authorization: Bearer TOKEN" \
  -d '{"question": "test"}'

# Admin (requiere auth)
curl https://API_URL/prod/api/admin/courses \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Todos deberían funcionar igual que antes.

---

## 📈 Workflow de Actualización de Layers

### **Cuando actualizas shared/:**

```bash
# 1. Build nuevo layer
./scripts/build_layers.sh

# 2. Deploy nueva versión del layer
./scripts/deploy_layers.sh
# Output: arn:...:cloudacademy-shared-code:2 (version 2)

# 3. Actualizar lambdas para usar v2
aws lambda update-function-configuration \
  --function-name cloudacademy-courses-handler \
  --layers \
    arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-dependencies:1 \
    arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-shared-code:2

# Repetir para todos los lambdas
```

**Beneficio:** NO necesitas re-empaquetar ni redeploy el código de los lambdas.

---

### **Cuando actualizas dependencies:**

```bash
# 1. Modificar requirements.txt
echo "requests==2.31.0" >> requirements.txt

# 2. Build nuevo layer
./scripts/build_layers.sh

# 3. Deploy nueva versión
./scripts/deploy_layers.sh
# Output: arn:...:cloudacademy-dependencies:2

# 4. Actualizar lambdas
aws lambda update-function-configuration \
  --function-name cloudacademy-courses-handler \
  --layers \
    arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-dependencies:2 \
    arn:aws:lambda:us-east-1:ACCOUNT:layer:cloudacademy-shared-code:1
```

---

## ✅ Checklist de Implementación

- [ ] Scripts de build revisados
- [ ] Docker instalado (si build_layers.sh lo requiere)
- [ ] Layers built localmente
- [ ] Layers deployados a AWS (ARNs obtenidos)
- [ ] Terraform actualizado con layer ARNs
- [ ] package-lambdas.sh modificado (sin shared/)
- [ ] Lambdas re-empaquetados (ZIPs pequeños)
- [ ] Lambdas deployados con layers
- [ ] Test de funcionalidad OK
- [ ] Test de cold start mejorado

---

## 🎯 Criterios de Éxito

✅ **Implementación exitosa si:**
1. Layers aparecen en AWS Lambda console
2. Lambdas tienen 2 layers asociados
3. Deployment package < 10KB
4. Todos los endpoints funcionan

✅ **Performance mejorado si:**
- Cold start < 1 segundo (vs 3-5s antes)
- Warm requests sin cambio de latencia
- CloudWatch logs muestran init duration reducido

---

## 💰 Costos

- Lambda Layers: **Gratis** (no hay cargo extra)
- Storage: **$0.03/GB-month** (layers ~30MB = $0.001/mes)
- Invocations: Sin cambio

**Total:** Prácticamente gratis, mejora performance

---

## 🚨 Troubleshooting

**Error: "Unable to import module 'shared'"**
- Verificar que shared-code layer está asociado al lambda
- Verificar estructura: `python/shared/__init__.py` en el ZIP

**Cold start sigue lento:**
- Verificar que dependencies layer tiene boto3, powertools
- Ver CloudWatch logs → Init Duration para confirmar

**Layers no aparecen:**
- Verificar región correcta (layers son por región)
- Verificar permissions en layer (debe ser accesible por la cuenta)

---

## 📚 Límites de Layers

- Máximo **5 layers** por lambda
- Tamaño total (código + layers): **250MB** unzipped
- Cada layer: **50MB** zipped

Tu caso:
- Dependencies layer: ~30MB ✅
- Shared code layer: ~50KB ✅
- Total: 30MB < 250MB ✅

---

## 🔗 Referencias

- [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
- [Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

**Última actualización:** 2025-11-14
**Autor:** CloudAcademy DevOps Team
