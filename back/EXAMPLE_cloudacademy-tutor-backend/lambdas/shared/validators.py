"""
Validadores de entrada para prevenir bugs y vulnerabilidades

Proporciona validación robusta de inputs de usuarios para:
- Prevenir inyección de código
- Validar tipos y formatos
- Asegurar rangos y longitudes apropiadas
- Sanitizar strings peligrosos
"""

import re
from typing import Optional, List, Dict, Any


class ValidationError(Exception):
    """Error de validación personalizado"""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


class InputValidator:
    """Validador principal para inputs de usuarios"""

    # Caracteres peligrosos para DynamoDB keys
    DANGEROUS_CHARS = ['$', '{', '}', '#', ':', ';', '\\', '/', '*', '?', '<', '>', '|', '\n', '\r', '\t']

    @staticmethod
    def validate_course_id(course_id: Any) -> Optional[str]:
        """
        Valida course_id

        Reglas:
        - Debe ser string
        - Longitud: 3-50 caracteres
        - Solo letras minúsculas, números y guiones
        - No puede empezar o terminar con guión

        Args:
            course_id: ID del curso a validar

        Returns:
            None si es válido, mensaje de error si no lo es

        Examples:
            >>> InputValidator.validate_course_id("image-gen-bedrock")
            None

            >>> InputValidator.validate_course_id("Course With Spaces")
            "course_id must contain only lowercase letters, numbers, and hyphens"

            >>> InputValidator.validate_course_id("ab")
            "course_id must be between 3 and 50 characters"
        """
        if not isinstance(course_id, str):
            return "course_id must be a string"

        if len(course_id) < 3 or len(course_id) > 50:
            return "course_id must be between 3 and 50 characters"

        if not re.match(r'^[a-z0-9-]+$', course_id):
            return "course_id must contain only lowercase letters, numbers, and hyphens"

        if course_id.startswith('-') or course_id.endswith('-'):
            return "course_id cannot start or end with a hyphen"

        # Verificar caracteres peligrosos (defensa adicional)
        if any(char in course_id for char in InputValidator.DANGEROUS_CHARS):
            return "course_id contains invalid characters"

        return None

    @staticmethod
    def validate_course_name(name: Any) -> Optional[str]:
        """
        Valida course_name o title

        Reglas:
        - Debe ser string
        - Longitud: 5-200 caracteres
        - No debe contener solo espacios

        Args:
            name: Nombre del curso

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(name, str):
            return "course_name must be a string"

        if len(name.strip()) < 5:
            return "course_name must be at least 5 characters (excluding whitespace)"

        if len(name) > 200:
            return "course_name must not exceed 200 characters"

        if not name.strip():
            return "course_name cannot be only whitespace"

        return None

    @staticmethod
    def validate_description(description: Any, min_length: int = 10, max_length: int = 2000) -> Optional[str]:
        """
        Valida descripción o contenido textual

        Args:
            description: Texto a validar
            min_length: Longitud mínima (default 10)
            max_length: Longitud máxima (default 2000)

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(description, str):
            return "description must be a string"

        if len(description.strip()) < min_length:
            return f"description must be at least {min_length} characters"

        if len(description) > max_length:
            return f"description must not exceed {max_length} characters"

        return None

    @staticmethod
    def validate_section_id(section_id: Any) -> Optional[str]:
        """
        Valida section_id

        Reglas:
        - Debe ser entero
        - Rango: 0-999

        Args:
            section_id: ID de la sección

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        # Intentar convertir a int
        try:
            section_id_int = int(section_id)
        except (ValueError, TypeError):
            return "section_id must be a valid integer"

        if section_id_int < 0 or section_id_int > 999:
            return "section_id must be between 0 and 999"

        return None

    @staticmethod
    def validate_category_id(category_id: Any) -> Optional[str]:
        """
        Valida category_id

        Similar a course_id pero permite mayúsculas después de convertir

        Args:
            category_id: ID de la categoría

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(category_id, str):
            return "category_id must be a string"

        if len(category_id) < 2 or len(category_id) > 50:
            return "category_id must be between 2 and 50 characters"

        # Permitir letras, números y guiones (case-insensitive)
        if not re.match(r'^[a-zA-Z0-9-]+$', category_id):
            return "category_id must contain only letters, numbers, and hyphens"

        return None

    @staticmethod
    def validate_difficulty(difficulty: Any) -> Optional[str]:
        """
        Valida nivel de dificultad

        Args:
            difficulty: Nivel de dificultad

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        valid_difficulties = ['Beginner', 'Intermediate', 'Advanced']

        if difficulty not in valid_difficulties:
            return f"difficulty must be one of: {', '.join(valid_difficulties)}"

        return None

    @staticmethod
    def validate_content_type(content_type: Any, allowed_types: List[str] = None) -> Optional[str]:
        """
        Valida content_type para uploads

        Args:
            content_type: MIME type
            allowed_types: Lista de tipos permitidos (default: imágenes)

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if allowed_types is None:
            allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

        if not isinstance(content_type, str):
            return "content_type must be a string"

        if content_type not in allowed_types:
            return f"content_type must be one of: {', '.join(allowed_types)}"

        return None

    @staticmethod
    def validate_filename(filename: Any) -> Optional[str]:
        """
        Valida nombre de archivo

        Reglas:
        - No debe contener path traversal (../, /, \\)
        - Longitud máxima: 255 caracteres
        - Solo caracteres seguros

        Args:
            filename: Nombre del archivo

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(filename, str):
            return "filename must be a string"

        if len(filename) > 255:
            return "filename must not exceed 255 characters"

        # Prevenir path traversal
        if '../' in filename or '..\\'  in filename or filename.startswith('/'):
            return "filename contains invalid path characters"

        # Solo permitir caracteres seguros: letras, números, guión, underscore, punto
        if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
            return "filename contains invalid characters (only letters, numbers, dots, hyphens and underscores allowed)"

        return None

    @staticmethod
    def validate_email(email: Any) -> Optional[str]:
        """
        Valida email (básico)

        Args:
            email: Email a validar

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(email, str):
            return "email must be a string"

        # Regex básico para email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

        if not re.match(email_pattern, email):
            return "email format is invalid"

        if len(email) > 254:  # RFC 5321
            return "email must not exceed 254 characters"

        return None

    @staticmethod
    def validate_url(url: Any, require_https: bool = False) -> Optional[str]:
        """
        Valida URL

        Args:
            url: URL a validar
            require_https: Si True, solo permite HTTPS

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(url, str):
            return "url must be a string"

        if require_https:
            url_pattern = r'^https://[^\s/$.?#].[^\s]*$'
            if not re.match(url_pattern, url):
                return "url must be a valid HTTPS URL"
        else:
            url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
            if not re.match(url_pattern, url):
                return "url must be a valid HTTP/HTTPS URL"

        if len(url) > 2048:
            return "url must not exceed 2048 characters"

        return None

    @staticmethod
    def validate_positive_number(value: Any, field_name: str = "value") -> Optional[str]:
        """
        Valida que sea un número positivo

        Args:
            value: Valor a validar
            field_name: Nombre del campo (para mensaje de error)

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        try:
            num = float(value)
        except (ValueError, TypeError):
            return f"{field_name} must be a valid number"

        if num < 0:
            return f"{field_name} must be a positive number"

        return None

    @staticmethod
    def validate_integer_range(value: Any, min_val: int, max_val: int, field_name: str = "value") -> Optional[str]:
        """
        Valida que sea un entero dentro de un rango

        Args:
            value: Valor a validar
            min_val: Valor mínimo (inclusive)
            max_val: Valor máximo (inclusive)
            field_name: Nombre del campo

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        try:
            num = int(value)
        except (ValueError, TypeError):
            return f"{field_name} must be a valid integer"

        if num < min_val or num > max_val:
            return f"{field_name} must be between {min_val} and {max_val}"

        return None

    @staticmethod
    def validate_list(value: Any, min_items: int = 0, max_items: int = 100, field_name: str = "list") -> Optional[str]:
        """
        Valida que sea una lista con longitud apropiada

        Args:
            value: Valor a validar
            min_items: Número mínimo de items
            max_items: Número máximo de items
            field_name: Nombre del campo

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(value, list):
            return f"{field_name} must be a list"

        if len(value) < min_items:
            return f"{field_name} must contain at least {min_items} items"

        if len(value) > max_items:
            return f"{field_name} must not exceed {max_items} items"

        return None

    @staticmethod
    def validate_dict(value: Any, required_keys: List[str] = None, field_name: str = "object") -> Optional[str]:
        """
        Valida que sea un diccionario con keys requeridos

        Args:
            value: Valor a validar
            required_keys: Lista de keys requeridos
            field_name: Nombre del campo

        Returns:
            None si es válido, mensaje de error si no lo es
        """
        if not isinstance(value, dict):
            return f"{field_name} must be an object"

        if required_keys:
            missing_keys = [key for key in required_keys if key not in value]
            if missing_keys:
                return f"{field_name} is missing required keys: {', '.join(missing_keys)}"

        return None

    @staticmethod
    def sanitize_string(value: str, max_length: int = None) -> str:
        """
        Sanitiza un string removiendo caracteres peligrosos

        Args:
            value: String a sanitizar
            max_length: Longitud máxima (trunca si excede)

        Returns:
            String sanitizado
        """
        if not isinstance(value, str):
            return str(value)

        # Remover caracteres de control
        sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')

        # Truncar si es necesario
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]

        return sanitized.strip()

    @classmethod
    def validate_required_fields(cls, data: Dict[str, Any], required_fields: List[str]) -> List[str]:
        """
        Valida que todos los campos requeridos estén presentes

        Args:
            data: Diccionario con datos
            required_fields: Lista de campos requeridos

        Returns:
            Lista de errores (vacía si todo OK)

        Examples:
            >>> data = {'name': 'Test', 'email': 'test@example.com'}
            >>> InputValidator.validate_required_fields(data, ['name', 'email', 'age'])
            ['Missing required field: age']
        """
        errors = []
        for field in required_fields:
            if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field].strip()):
                errors.append(f"Missing required field: {field}")
        return errors
