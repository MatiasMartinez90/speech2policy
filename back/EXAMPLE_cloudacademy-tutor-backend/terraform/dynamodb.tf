# Tablas DynamoDB para CloudAcademy Tutor Backend

# ============================================================================
# Tabla 1: CourseCatalog
# ============================================================================
# Almacena metadata de cursos y contenido de secciones
# PK: COURSE#{course_id}
# SK: METADATA | SECTION#{section_id}

resource "aws_dynamodb_table" "courses_catalog" {
  name         = "CourseCatalog"
  billing_mode = "PAY_PER_REQUEST" # On-Demand pricing
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S" # String
  }

  attribute {
    name = "SK"
    type = "S" # String
  }

  # Atributos para GSI - permitir queries eficientes por tipo de entidad
  attribute {
    name = "entity_type"
    type = "S" # COURSE_METADATA | COURSE_SECTION
  }

  attribute {
    name = "created_at"
    type = "S" # ISO timestamp para ordenar por fecha
  }

  # GSI para listar cursos sin hacer scan completo de la tabla
  # Permite query directa de metadata: entity_type = "COURSE_METADATA"
  global_secondary_index {
    name            = "entity_type-created_at-index"
    hash_key        = "entity_type"
    range_key       = "created_at"
    projection_type = "ALL" # Incluir todos los atributos
  }

  # Habilitar Point-in-Time Recovery para backups
  point_in_time_recovery {
    enabled = true
  }

  # Habilitar encriptación (usar default AWS managed key)
  server_side_encryption {
    enabled = true
    # No especificamos kms_key_arn para usar la key default de AWS
  }

  tags = {
    Name        = "CourseCatalog"
    Description = "Metadata de cursos y contenido de secciones"
  }
}

# ============================================================================
# Tabla 2: UserProgress
# ============================================================================
# Tracking de progreso individual por usuario y curso
# PK: USER#{email}
# SK: COURSE#{course_id}

resource "aws_dynamodb_table" "user_progress" {
  name         = "UserProgress"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI para queries por curso (obtener todos los usuarios de un curso)
  attribute {
    name = "course_id"
    type = "S"
  }

  global_secondary_index {
    name            = "course_id-index"
    hash_key        = "course_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  # No especificar server_side_encryption para evitar error de KMS key
  # DynamoDB usa encriptación por defecto

  tags = {
    Name        = "UserProgress"
    Description = "Progreso de usuarios en los cursos"
  }
}

# ============================================================================
# Tabla 3: TutorSessions
# ============================================================================
# Historial de conversaciones del tutor IA
# PK: SESSION#{session_id}
# SK: TIMESTAMP#{iso_timestamp}
# TTL: 30 días (auto-delete)

resource "aws_dynamodb_table" "tutor_sessions" {
  name         = "TutorSessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # Configurar TTL para auto-delete después de 30 días
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  # No especificar server_side_encryption para evitar error de KMS key
  # DynamoDB usa encriptación por defecto

  tags = {
    Name        = "TutorSessions"
    Description = "Historial de conversaciones con tutor IA - TTL 30 dias"
  }
}

# ============================================================================
# Tabla 4: UserUsage
# ============================================================================
# Rate limiting y tracking de uso por usuario
# PK: user_id (email o anon_IP)
# SK: period (formato: YYYY-MM-DD-HH para hora, YYYY-MM-DD para día, TOTAL para anónimos)
# TTL: 7 días (auto-delete)

resource "aws_dynamodb_table" "user_usage" {
  name         = "UserUsage"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "period"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "period"
    type = "S"
  }

  # Configurar TTL para auto-delete después de 7 días
  # (excepto registros con period="TOTAL" que no tienen TTL)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  # No especificar server_side_encryption para evitar error de KMS key
  # DynamoDB usa encriptación por defecto

  tags = {
    Name        = "UserUsage"
    Description = "Rate limiting y tracking de uso - TTL 7 dias"
  }
}

# ============================================================================
# Tabla 5: Users
# ============================================================================
# Perfiles de usuarios de CloudAcademy
# PK: USER#{cognito_user_id}
# SK: PROFILE
# GSI: email-index (para buscar por email)

resource "aws_dynamodb_table" "users" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI para buscar usuarios por email
  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  # DynamoDB usa encriptación por defecto

  tags = {
    Name        = "Users"
    Description = "Perfiles de usuarios - Creados via Cognito PostConfirmation"
  }
}

# ============================================================================
# Tabla 6: Categories
# ============================================================================
# Categorías de cursos dinámicas
# PK: CATEGORY#{category_id}
# SK: METADATA
# GSI: display_order-index (is_active + display_order)

resource "aws_dynamodb_table" "categories" {
  name         = "Categories"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI para listar categorías activas ordenadas por display_order
  attribute {
    name = "is_active"
    type = "S" # "true" o "false" como string
  }

  attribute {
    name = "display_order"
    type = "N" # Number
  }

  global_secondary_index {
    name            = "display_order-index"
    hash_key        = "is_active"
    range_key       = "display_order"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  # DynamoDB usa encriptación por defecto

  tags = {
    Name        = "Categories"
    Description = "Categorías de cursos - Gestión dinámica desde admin panel"
  }
}

# ============================================================================
# Outputs locales (se exportan en outputs.tf)
# ============================================================================

locals {
  dynamodb_tables = {
    courses_catalog = aws_dynamodb_table.courses_catalog.name
    user_progress   = aws_dynamodb_table.user_progress.name
    tutor_sessions  = aws_dynamodb_table.tutor_sessions.name
    user_usage      = aws_dynamodb_table.user_usage.name
    users           = aws_dynamodb_table.users.name
    categories      = aws_dynamodb_table.categories.name
  }

  dynamodb_arns = {
    courses_catalog = aws_dynamodb_table.courses_catalog.arn
    user_progress   = aws_dynamodb_table.user_progress.arn
    tutor_sessions  = aws_dynamodb_table.tutor_sessions.arn
    user_usage      = aws_dynamodb_table.user_usage.arn
    users           = aws_dynamodb_table.users.arn
    categories      = aws_dynamodb_table.categories.arn
  }
}
