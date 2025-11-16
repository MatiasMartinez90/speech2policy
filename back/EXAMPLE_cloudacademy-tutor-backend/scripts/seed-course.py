#!/usr/bin/env python3
"""
Script para cargar el curso demo "Generador de Imágenes con IA" en DynamoDB

Curso: image-gen-bedrock
Secciones: 6 (0-5)
- Sección 0: Introducción
- Sección 1: Configurar Lambda
- Sección 2: Amazon Bedrock
- Sección 3: S3 Storage
- Sección 4: API Gateway Setup
- Sección 5: Testing & Debugging

Uso:
    python scripts/seed-course.py
"""

import boto3
import json
from datetime import datetime, timezone
from decimal import Decimal

# Cliente DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('CourseCatalog')

def seed_course_metadata():
    """Carga la metadata del curso"""

    print("📚 Cargando metadata del curso 'image-gen-bedrock'...")

    metadata = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'METADATA',

        # Identificación
        'course_id': 'image-gen-bedrock',
        'course_name': 'Generador de Imágenes con IA en AWS',
        'course_description': 'Construye un API serverless que genera imágenes usando Amazon Bedrock Titan',
        'course_image': 'https://cloudacademy-assets.s3.amazonaws.com/courses/image-gen/hero.png',

        # Categorización
        'category': 'AWS & AI',
        'difficulty': 'intermediate',
        'tags': ['AWS', 'Bedrock', 'Lambda', 'API Gateway', 'S3', 'IA', 'Python'],
        'estimated_duration_minutes': 60,

        # Configuración del curso
        'is_linear': True,
        'total_sections': 6,

        # Configuración del tutor IA
        'tutor_personality': {
            'style': 'amigable y motivador',
            'use_emojis': True,
            'emoji_frequency': 'moderado',
            'tone': 'pedagógico pero directo'
        },

        # Contexto del proyecto
        'project_description': 'API serverless que genera imágenes usando Amazon Bedrock Titan Image Generator',
        'project_goal': 'Al final tendrás un API funcional que genera imágenes desde texto',
        'technologies': ['API Gateway', 'Lambda', 'Amazon Bedrock', 'S3', 'Python'],

        # Errores comunes
        'common_errors': [
            {
                'error_code': 'ERR_001',
                'error': "KeyError: 'prompt'",
                'cause': 'Lambda Proxy Integration deshabilitado en API Gateway',
                'solution': "Habilitar 'Use Lambda Proxy Integration' en API Gateway",
                'section_id': 4,
                'difficulty': 'common'
            },
            {
                'error_code': 'ERR_002',
                'error': 'Access Denied (S3)',
                'cause': 'Nombre de bucket incorrecto en el código Lambda',
                'solution': 'Verificar que el nombre del bucket coincida exactamente',
                'section_id': 3,
                'difficulty': 'common'
            },
            {
                'error_code': 'ERR_003',
                'error': 'ValidationException: Content filters',
                'cause': 'Prompt bloqueado por filtros de AWS Bedrock',
                'solution': 'Evitar nombres de personas/celebridades, usar prompts genéricos',
                'section_id': 5,
                'difficulty': 'very_common'
            }
        ],

        # Metadata administrativa
        'published': True,
        'version': '1.0',
        'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'updated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'created_by': 'admin@cloudacademy.ar',

        # SEO y marketing
        'student_count': 0,
        'average_rating': Decimal('0.0'),
        'completion_rate': Decimal('0.0')
    }

    table.put_item(Item=metadata)
    print("✅ Metadata del curso cargada")


def seed_section_0():
    """Sección 0: Introducción"""

    print("📖 Cargando Sección 0: Introducción...")

    section = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'SECTION#0',

        'section_id': 0,
        'title': 'Introducción',
        'subtitle': '¿Qué vamos a construir?',
        'icon': '🚀',
        'color_gradient': 'from-purple-500 to-purple-600',

        'learning_objectives': [
            'Entender la arquitectura serverless',
            'Conocer Amazon Bedrock y sus capacidades',
            'Visualizar el proyecto completo end-to-end'
        ],

        'content_type': 'introduction',
        'content_data': {
            'architecture_diagram': {
                'url': 'https://cloudacademy-assets.s3.amazonaws.com/diagrams/image-gen-arch.png',
                'alt': 'Diagrama de arquitectura: API Gateway → Lambda → Bedrock → S3'
            },

            'key_concepts': [
                {
                    'title': 'API Gateway',
                    'description': 'Punto de entrada HTTP para tu API. Recibe requests de usuarios.',
                    'icon': '🌐',
                    'aws_docs': 'https://docs.aws.amazon.com/apigateway/'
                },
                {
                    'title': 'AWS Lambda',
                    'description': 'Función serverless que procesa requests sin gestionar servidores.',
                    'icon': '⚡',
                    'aws_docs': 'https://docs.aws.amazon.com/lambda/'
                },
                {
                    'title': 'Amazon Bedrock',
                    'description': 'Servicio de IA generativa que provee acceso a modelos fundacionales.',
                    'icon': '🧠',
                    'aws_docs': 'https://docs.aws.amazon.com/bedrock/'
                },
                {
                    'title': 'Amazon S3',
                    'description': 'Almacenamiento de objetos para guardar las imágenes generadas.',
                    'icon': '🗄️',
                    'aws_docs': 'https://docs.aws.amazon.com/s3/'
                }
            ],

            'estimated_cost': '$0.50 para completar todo el proyecto',
            'prerequisites': [
                'Cuenta AWS activa (capa gratuita es suficiente)',
                'Conocimientos básicos de Python',
                'Familiaridad con AWS Console',
                'Editor de código (VSCode recomendado)'
            ],

            'what_you_will_build': {
                'description': 'Un API REST que acepta un prompt de texto y retorna una imagen generada por IA',
                'example_request': 'GET /image-generator?prompt=a sunset over the ocean',
                'example_response': 'URL de imagen generada almacenada en S3'
            }
        },

        'checkpoint': {
            'question': '¿Qué servicios AWS usaremos en este proyecto y cuál es el rol específico de cada uno en el flujo?',
            'placeholder': 'En este proyecto usaremos los siguientes servicios AWS...',
            'char_limit': 500,

            'validation_criteria': [
                {
                    'criterion': 'Menciona API Gateway',
                    'weight': 25,
                    'keywords': ['api gateway', 'gateway', 'endpoint'],
                    'context_required': 'como punto de entrada HTTP'
                },
                {
                    'criterion': 'Menciona Lambda',
                    'weight': 25,
                    'keywords': ['lambda', 'función', 'serverless'],
                    'context_required': 'para procesamiento de la lógica'
                },
                {
                    'criterion': 'Menciona Bedrock',
                    'weight': 25,
                    'keywords': ['bedrock', 'titan', 'ia', 'modelo'],
                    'context_required': 'para generación de imágenes'
                },
                {
                    'criterion': 'Menciona S3',
                    'weight': 25,
                    'keywords': ['s3', 'bucket', 'almacenamiento'],
                    'context_required': 'para guardar imágenes'
                }
            ],

            'hints': [
                {
                    'level': 1,
                    'text': '💡 Pista 1/3: Piensa en el flujo de datos. El usuario hace una request HTTP → ¿Dónde llega primero? → ¿Dónde se ejecuta el código? → ¿Quién genera la imagen? → ¿Dónde se almacena el resultado?'
                },
                {
                    'level': 2,
                    'text': '💡 Pista 2/3: Necesitamos 4 servicios AWS:\n1. Uno para recibir requests HTTP del usuario\n2. Uno para ejecutar código Python sin servidor\n3. Uno para generar imágenes con IA\n4. Uno para almacenar archivos\n\n¿Cuáles servicios de AWS cumplen estas funciones?'
                },
                {
                    'level': 3,
                    'text': '💡 Pista 3/3 (última): La arquitectura completa es:\n\n**API Gateway** → Recibe la request HTTP\n**Lambda** → Ejecuta el código Python\n**Bedrock (Titan)** → Genera la imagen\n**S3** → Almacena la imagen\n\nAhora explica con tus palabras qué hace cada uno.'
                }
            ],

            'sample_correct_answer': 'En este proyecto usaremos 4 servicios AWS: API Gateway como punto de entrada para recibir las requests HTTP del usuario, Lambda para ejecutar el código Python que procesa la request, Amazon Bedrock con el modelo Titan para generar las imágenes a partir del prompt, y S3 para almacenar las imágenes generadas y servir las URLs.'
        },

        'order': 0,
        'is_required': True,
        'estimated_time_minutes': 10,
        'previous_section': None,
        'next_section': 1
    }

    table.put_item(Item=section)
    print("✅ Sección 0 cargada")


def seed_section_1():
    """Sección 1: Configurar Lambda"""

    print("📖 Cargando Sección 1: Configurar Lambda...")

    section = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'SECTION#1',

        'section_id': 1,
        'title': 'Configurar Lambda Function',
        'subtitle': 'Crea tu función serverless',
        'icon': '⚡',
        'color_gradient': 'from-orange-500 to-orange-600',

        'learning_objectives': [
            'Crear una función Lambda en AWS Console',
            'Configurar permisos IAM correctos',
            'Entender la estructura básica del código Python',
            'Configurar timeout y memoria adecuados'
        ],

        'content_type': 'lambda_setup',
        'content_data': {
            'steps': [
                {
                    'step_number': 1,
                    'title': 'Navegar a AWS Lambda Console',
                    'instructions': 'Ve a la consola de AWS Lambda y prepárate para crear una nueva función',
                    'console_url': 'https://console.aws.amazon.com/lambda',
                    'estimated_minutes': 1
                },
                {
                    'step_number': 2,
                    'title': 'Crear función Lambda',
                    'instructions': "Haz click en 'Create function' y selecciona 'Author from scratch'",
                    'details': [
                        'Function name: image-generator-bedrock',
                        'Runtime: Python 3.11',
                        'Architecture: x86_64'
                    ],
                    'estimated_minutes': 2
                },
                {
                    'step_number': 3,
                    'title': 'Configurar ajustes básicos',
                    'instructions': 'En la sección de configuración, ajusta estos parámetros',
                    'configuration': {
                        'timeout': {
                            'value': 30,
                            'unit': 'seconds',
                            'reason': 'Bedrock puede tardar 10-20 segundos en generar imágenes'
                        },
                        'memory': {
                            'value': 512,
                            'unit': 'MB',
                            'reason': 'Suficiente para procesar imágenes base64'
                        }
                    },
                    'estimated_minutes': 2
                }
            ],

            'key_points': [
                {
                    'icon': '⏱️',
                    'title': 'Timeout',
                    'description': '30 segundos porque Bedrock puede tardar en generar imágenes',
                    'importance': 'high'
                },
                {
                    'icon': '💾',
                    'title': 'Memoria',
                    'description': '512 MB es suficiente para procesar imágenes en base64',
                    'importance': 'medium'
                },
                {
                    'icon': '🐍',
                    'title': 'Runtime Python 3.11',
                    'description': 'Versión más reciente compatible con boto3 y Bedrock',
                    'importance': 'high'
                }
            ]
        },

        'checkpoint': {
            'question': '¿Por qué necesitamos configurar permisos IAM para nuestra función Lambda y qué permisos específicos necesitamos para este proyecto?',
            'placeholder': 'Lambda necesita permisos IAM porque...',
            'char_limit': 500,

            'validation_criteria': [
                {
                    'criterion': 'Entiende que Lambda necesita permisos para acceder a otros servicios',
                    'weight': 30,
                    'keywords': ['permisos', 'acceso', 'servicios'],
                    'context_required': 'no puede acceder a otros servicios por defecto'
                },
                {
                    'criterion': 'Menciona Bedrock',
                    'weight': 35,
                    'keywords': ['bedrock', 'invokemodel', 'invoke'],
                    'context_required': 'para invocar el modelo de IA'
                },
                {
                    'criterion': 'Menciona S3',
                    'weight': 35,
                    'keywords': ['s3', 'putobject', 'guardar', 'subir'],
                    'context_required': 'para guardar las imágenes generadas'
                }
            ],

            'hints': [
                {
                    'level': 1,
                    'text': '💡 Pista 1/3: Por defecto, Lambda no tiene permiso para acceder a otros servicios de AWS. Piensa en qué servicios va a llamar nuestra función.'
                },
                {
                    'level': 2,
                    'text': '💡 Pista 2/3: Nuestra Lambda va a:\n1. Invocar un modelo en Bedrock → Necesita permiso bedrock:InvokeModel\n2. Subir imágenes a S3 → Necesita permiso s3:PutObject\n\n¿Cómo se otorgan estos permisos en AWS?'
                },
                {
                    'level': 3,
                    'text': '💡 Pista 3/3: IAM (Identity and Access Management) permite asignar roles y políticas a Lambda. Necesitamos una política que incluya:\n- bedrock:InvokeModel (para generar imágenes)\n- s3:PutObject (para guardar en el bucket)\n- Logs de CloudWatch (ya incluido por defecto)'
                }
            ]
        },

        'order': 1,
        'is_required': True,
        'estimated_time_minutes': 15,
        'previous_section': 0,
        'next_section': 2
    }

    table.put_item(Item=section)
    print("✅ Sección 1 cargada")


def seed_section_2():
    """Sección 2: Amazon Bedrock"""

    print("📖 Cargando Sección 2: Amazon Bedrock...")

    section = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'SECTION#2',

        'section_id': 2,
        'title': 'Amazon Bedrock - Generación de Imágenes',
        'subtitle': 'Configura el modelo Titan Image Generator',
        'icon': '🎨',
        'color_gradient': 'from-pink-500 to-pink-600',

        'learning_objectives': [
            'Habilitar el modelo Titan Image Generator en Bedrock',
            'Entender el formato de request/response de Bedrock',
            'Conocer las diferencias entre modelos disponibles',
            'Implementar la invocación del modelo en Lambda'
        ],

        'content_type': 'bedrock_setup',
        'content_data': {
            'steps': [
                {
                    'step_number': 1,
                    'title': 'Habilitar acceso a modelos',
                    'instructions': 'En la consola de Bedrock, solicita acceso a Amazon Titan Image Generator',
                    'console_url': 'https://console.aws.amazon.com/bedrock',
                    'details': [
                        "Ve a 'Model access' en el menú lateral",
                        "Click en 'Manage model access'",
                        "Selecciona 'Amazon Titan Image Generator G1'",
                        "Click 'Save changes'",
                        'Espera aprobación (usualmente instantánea)'
                    ],
                    'estimated_minutes': 3
                }
            ],

            'model_comparison': [
                {
                    'model_id': 'amazon.titan-image-generator-v1',
                    'name': 'Amazon Titan Image Generator',
                    'provider': 'Amazon',
                    'status': '✅ Disponible',
                    'pros': [
                        'Modelo de Amazon, siempre disponible',
                        'Buen balance calidad/costo',
                        'Soporte oficial de AWS'
                    ],
                    'cons': [
                        'Menos detalle que Stability AI en algunos casos'
                    ],
                    'pricing': '$0.008 por imagen (1024x1024)',
                    'recommended': True
                }
            ],

            'key_points': [
                {
                    'icon': '🎯',
                    'title': 'Model ID correcto',
                    'description': "Usa 'amazon.titan-image-generator-v1'",
                    'importance': 'critical'
                },
                {
                    'icon': '📐',
                    'title': 'Dimensiones',
                    'description': '1024x1024 es el tamaño estándar para buena calidad',
                    'importance': 'medium'
                },
                {
                    'icon': '💰',
                    'title': 'Costo',
                    'description': '$0.008 por imagen con Titan (~100 imágenes = $0.80)',
                    'importance': 'high'
                }
            ]
        },

        'checkpoint': {
            'question': "¿Qué es un 'prompt' en el contexto de generación de imágenes con IA?",
            'placeholder': 'Un prompt es...',
            'char_limit': 300,

            'validation_criteria': [
                {
                    'criterion': 'Explica qué es un prompt',
                    'weight': 50,
                    'keywords': ['prompt', 'descripción', 'texto', 'instrucción'],
                    'context_required': 'texto que describe la imagen a generar'
                },
                {
                    'criterion': 'Entiende su función',
                    'weight': 50,
                    'keywords': ['entrada', 'input', 'modelo', 'generar'],
                    'context_required': 'entrada para el modelo de IA'
                }
            ],

            'hints': [
                {
                    'level': 1,
                    'text': '💡 Pista 1/3: Un prompt es la entrada que le das al modelo. Piensa en cómo le explicarías a alguien qué imagen quieres.'
                },
                {
                    'level': 2,
                    'text': "💡 Pista 2/3: El prompt es el texto descriptivo de la imagen (ej: 'a sunset over the ocean')."
                },
                {
                    'level': 3,
                    'text': '💡 Pista 3/3: Un prompt es la descripción en texto de la imagen que quieres generar. Es la instrucción que le das al modelo de IA para que sepa qué crear.'
                }
            ]
        },

        'order': 2,
        'is_required': True,
        'estimated_time_minutes': 12,
        'previous_section': 1,
        'next_section': 3
    }

    table.put_item(Item=section)
    print("✅ Sección 2 cargada")


def seed_section_3():
    """Sección 3: S3 Storage"""

    print("📖 Cargando Sección 3: S3 Storage...")

    section = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'SECTION#3',

        'section_id': 3,
        'title': 'Almacenamiento en S3',
        'subtitle': 'Guarda y comparte imágenes generadas',
        'icon': '🗄️',
        'color_gradient': 'from-teal-500 to-teal-600',

        'learning_objectives': [
            'Crear un bucket S3 para almacenar imágenes',
            'Configurar permisos del bucket correctamente',
            'Guardar imágenes desde Lambda',
            'Generar URLs pre-firmadas para compartir'
        ],

        'content_type': 's3_setup',
        'content_data': {
            'steps': [
                {
                    'step_number': 1,
                    'title': 'Crear bucket S3',
                    'instructions': 'Crea un bucket S3 para almacenar las imágenes generadas',
                    'console_url': 'https://s3.console.aws.amazon.com/s3',
                    'details': [
                        'Bucket name: image-bedrock-cloudacademy (debe ser único globalmente)',
                        'Region: us-east-1 (misma región que Lambda)',
                        'Block all public access: ✅ ACTIVADO',
                        'Versioning: Desactivado',
                        'Encryption: SSE-S3 (por defecto)'
                    ],
                    'estimated_minutes': 3
                }
            ],

            'key_points': [
                {
                    'icon': '🔒',
                    'title': 'Bucket privado',
                    'description': 'NUNCA hacer el bucket público. Usa URLs pre-firmadas.',
                    'importance': 'critical'
                },
                {
                    'icon': '🌍',
                    'title': 'Nombre único',
                    'description': 'El nombre del bucket debe ser único en TODO AWS',
                    'importance': 'high'
                },
                {
                    'icon': '⏰',
                    'title': 'URLs temporales',
                    'description': 'Las URLs pre-firmadas expiran (configuramos 1 hora)',
                    'importance': 'medium'
                }
            ]
        },

        'checkpoint': {
            'question': '¿Por qué usamos URLs pre-firmadas en lugar de hacer el bucket S3 público?',
            'placeholder': 'Usamos URLs pre-firmadas porque...',
            'char_limit': 400,

            'validation_criteria': [
                {
                    'criterion': 'Menciona seguridad',
                    'weight': 40,
                    'keywords': ['seguridad', 'privado', 'protección'],
                    'context_required': 'bucket debe permanecer privado'
                },
                {
                    'criterion': 'Explica URLs pre-firmadas',
                    'weight': 40,
                    'keywords': ['temporal', 'expira', 'tiempo limitado'],
                    'context_required': 'acceso temporal y controlado'
                },
                {
                    'criterion': 'Entiende el riesgo',
                    'weight': 20,
                    'keywords': ['público', 'cualquiera', 'acceso'],
                    'context_required': 'bucket público = cualquiera puede acceder'
                }
            ],

            'hints': [
                {
                    'level': 1,
                    'text': '💡 Pista 1/3: Piensa en qué pasaría si el bucket fuera público. ¿Quién podría acceder a las imágenes?'
                },
                {
                    'level': 2,
                    'text': '💡 Pista 2/3: Bucket público = cualquiera con la URL puede ver TODO el contenido. Las URLs pre-firmadas dan acceso temporal solo a archivos específicos.'
                },
                {
                    'level': 3,
                    'text': '💡 Pista 3/3: Usamos URLs pre-firmadas por seguridad. El bucket permanece privado, pero generamos URLs temporales (1 hora) que permiten acceder solo a imágenes específicas. Así controlamos quién y cuándo puede ver el contenido.'
                }
            ]
        },

        'order': 3,
        'is_required': True,
        'estimated_time_minutes': 15,
        'previous_section': 2,
        'next_section': 4
    }

    table.put_item(Item=section)
    print("✅ Sección 3 cargada")


def seed_section_4():
    """Sección 4: API Gateway"""

    print("📖 Cargando Sección 4: API Gateway...")

    section = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'SECTION#4',

        'section_id': 4,
        'title': 'API Gateway Setup',
        'subtitle': 'Expone tu Lambda como API REST',
        'icon': '🌐',
        'color_gradient': 'from-blue-500 to-blue-600',

        'learning_objectives': [
            'Crear un REST API en API Gateway',
            'Configurar método GET con query parameters',
            'Entender Lambda Proxy Integration',
            'Probar el endpoint desde la consola'
        ],

        'content_type': 'api_gateway_setup',
        'content_data': {
            'steps': [
                {
                    'step_number': 1,
                    'title': 'Crear REST API',
                    'instructions': 'En API Gateway, crea un nuevo REST API',
                    'console_url': 'https://console.aws.amazon.com/apigateway',
                    'details': [
                        'API type: REST API (no HTTP API)',
                        'API name: image-generator-api',
                        'Endpoint type: Regional'
                    ],
                    'estimated_minutes': 2
                },
                {
                    'step_number': 2,
                    'title': 'Crear método GET',
                    'instructions': 'Agrega un método GET',
                    'details': [
                        'Actions → Create Method → GET',
                        'Integration type: Lambda Function',
                        '✅ Use Lambda Proxy integration (IMPORTANTE!)',
                        'Lambda function: image-generator-bedrock'
                    ],
                    'estimated_minutes': 2
                }
            ],

            'key_points': [
                {
                    'icon': '🔌',
                    'title': 'Lambda Proxy Integration',
                    'description': 'SIEMPRE habilitar esta opción. Sin ella, no recibes query parameters.',
                    'importance': 'critical'
                },
                {
                    'icon': '🚀',
                    'title': 'Deploy requerido',
                    'description': 'Los cambios NO aplican hasta hacer Deploy API',
                    'importance': 'high'
                }
            ]
        },

        'checkpoint': {
            'question': '¿Qué es Lambda Proxy Integration y por qué es necesario para nuestro proyecto?',
            'placeholder': 'Lambda Proxy Integration es...',
            'char_limit': 500,

            'validation_criteria': [
                {
                    'criterion': 'Explica qué es Proxy Integration',
                    'weight': 40,
                    'keywords': ['proxy', 'integration', 'event', 'información'],
                    'context_required': 'pasa toda la información de la request a Lambda'
                },
                {
                    'criterion': 'Menciona query parameters',
                    'weight': 30,
                    'keywords': ['query', 'parameters', 'parametros', 'prompt'],
                    'context_required': 'permite recibir query string parameters'
                },
                {
                    'criterion': 'Relaciona con nuestro error',
                    'weight': 30,
                    'keywords': ['error', 'keyerror', 'prompt', 'no funcionaba'],
                    'context_required': "sin proxy no podíamos acceder a event['queryStringParameters']"
                }
            ],

            'hints': [
                {
                    'level': 1,
                    'text': "💡 Pista 1/3: Piensa en cómo nuestra Lambda necesita acceder al parámetro 'prompt'. ¿De dónde lo sacamos?"
                },
                {
                    'level': 2,
                    'text': "💡 Pista 2/3: Sin Proxy Integration, Lambda recibe un event vacío o incompleto. Con Proxy Integration, recibe queryStringParameters, headers, body, etc. ¿Recuerdas el error KeyError: 'prompt'?"
                },
                {
                    'level': 3,
                    'text': "💡 Pista 3/3: Lambda Proxy Integration hace que API Gateway pase TODA la información de la HTTP request a Lambda en el objeto 'event'. Incluye:\n- queryStringParameters (donde está 'prompt')\n- headers\n- body\n- httpMethod, path, etc.\n\nSin esto, event['queryStringParameters'] no existe → KeyError: 'prompt'"
                }
            ]
        },

        'order': 4,
        'is_required': True,
        'estimated_time_minutes': 12,
        'previous_section': 3,
        'next_section': 5
    }

    table.put_item(Item=section)
    print("✅ Sección 4 cargada")


def seed_section_5():
    """Sección 5: Testing & Debugging"""

    print("📖 Cargando Sección 5: Testing & Debugging...")

    section = {
        'PK': 'COURSE#image-gen-bedrock',
        'SK': 'SECTION#5',

        'section_id': 5,
        'title': 'Testing y Debugging',
        'subtitle': 'Prueba tu API y soluciona errores',
        'icon': '🧪',
        'color_gradient': 'from-green-500 to-green-600',

        'learning_objectives': [
            'Probar el API desde AWS Console',
            'Usar Postman para testing',
            'Identificar y solucionar errores comunes',
            'Validar el flujo end-to-end'
        ],

        'content_type': 'testing_debugging',
        'content_data': {
            'testing_methods': [
                {
                    'method': 'API Gateway Test',
                    'title': 'Probar desde AWS Console',
                    'steps': [
                        'En API Gateway, selecciona método GET',
                        "Click en 'TEST' (rayo azul)",
                        'En Query Strings, escribe: prompt=a beautiful sunset',
                        "Click 'Test'",
                        'Verifica status 200 y URL en response'
                    ]
                },
                {
                    'method': 'Postman',
                    'title': 'Probar con Postman',
                    'steps': [
                        'Abre Postman',
                        'Método: GET',
                        'URL: https://xxx.execute-api.us-east-1.amazonaws.com/dev/image-generator',
                        'Params → Key: prompt, Value: a beautiful sunset',
                        'Send'
                    ]
                }
            ],

            'common_errors': [
                {
                    'error_code': 'ERR_001',
                    'error_message': "KeyError: 'prompt'",
                    'status_code': 500,
                    'cause': 'Lambda Proxy Integration deshabilitado',
                    'solution_steps': [
                        'Ve a API Gateway → tu método GET',
                        "Click en 'Integration Request'",
                        "Verifica que 'Use Lambda Proxy integration' esté marcado",
                        'Si no está marcado, recrea el método GET con proxy habilitado',
                        'Deploy API de nuevo'
                    ],
                    'prevention': 'SIEMPRE habilitar Lambda Proxy Integration al crear métodos'
                },
                {
                    'error_code': 'ERR_002',
                    'error_message': 'Access Denied (S3)',
                    'status_code': 500,
                    'cause': 'Nombre de bucket incorrecto en el código Lambda',
                    'solution_steps': [
                        'Verifica el nombre exacto del bucket en S3 Console',
                        'Compara con el nombre en tu código Lambda',
                        'Corrige el nombre (debe coincidir EXACTAMENTE)',
                        'Guarda y prueba de nuevo'
                    ],
                    'prevention': 'Usar variables de entorno para el nombre del bucket'
                },
                {
                    'error_code': 'ERR_003',
                    'error_message': 'ValidationException: Content filters',
                    'status_code': 400,
                    'cause': 'AWS bloqueó el prompt por filtros de contenido',
                    'solution_steps': [
                        "Evita nombres de personas reales (ej: 'Maradona', 'Trump')",
                        'Evita nombres de marcas registradas',
                        'Usa descripciones genéricas',
                        "Ejemplos seguros: 'a sunset', 'a mountain', 'abstract art'"
                    ],
                    'prevention': 'Usar prompts genéricos y descriptivos'
                }
            ],

            'success_checklist': [
                '✅ API Gateway retorna status 200',
                '✅ Response contiene una URL pre-firmada',
                '✅ Al abrir la URL se ve la imagen generada',
                '✅ La imagen corresponde al prompt enviado',
                '✅ No hay errores en CloudWatch Logs'
            ]
        },

        'checkpoint': {
            'question': 'Menciona los 3 errores más comunes que encontramos durante el desarrollo y cómo se solucionó cada uno.',
            'placeholder': 'Los 3 errores principales fueron...',
            'char_limit': 600,

            'validation_criteria': [
                {
                    'criterion': 'Menciona KeyError prompt',
                    'weight': 35,
                    'keywords': ['keyerror', 'prompt', 'proxy'],
                    'context_required': 'se solucionó habilitando Lambda Proxy Integration'
                },
                {
                    'criterion': 'Menciona Access Denied S3',
                    'weight': 35,
                    'keywords': ['access denied', 's3', 'bucket', 'nombre'],
                    'context_required': 'nombre del bucket incorrecto'
                },
                {
                    'criterion': 'Menciona content filters',
                    'weight': 30,
                    'keywords': ['filtros', 'bloqueado', 'validation'],
                    'context_required': 'AWS bloqueó prompts con nombres de personas'
                }
            ],

            'hints': [
                {
                    'level': 1,
                    'text': '💡 Pista 1/3: Piensa en los 3 problemas principales que tuvimos: uno con API Gateway, uno con S3, y uno con Bedrock.'
                },
                {
                    'level': 2,
                    'text': '💡 Pista 2/3:\n1. API Gateway: KeyError porque faltaba... ¿qué configuración?\n2. S3: Access Denied porque el nombre del bucket...\n3. Bedrock: Validación falló cuando intentamos generar imagen de...'
                },
                {
                    'level': 3,
                    'text': "💡 Pista 3/3: Los 3 errores fueron:\n1. KeyError 'prompt' → Faltaba Lambda Proxy Integration\n2. Access Denied S3 → Nombre del bucket incorrecto en el código\n3. Content Filter → AWS bloqueó prompts con nombres de personas famosas"
                }
            ]
        },

        'order': 5,
        'is_required': True,
        'estimated_time_minutes': 20,
        'previous_section': 4,
        'next_section': None
    }

    table.put_item(Item=section)
    print("✅ Sección 5 cargada")


def main():
    """Función principal para ejecutar el seed"""

    print("\n" + "="*60)
    print("🌱 SEED DEL CURSO DEMO: Generador de Imágenes con IA")
    print("="*60 + "\n")

    try:
        # Cargar metadata del curso
        seed_course_metadata()

        # Cargar las 6 secciones
        seed_section_0()
        seed_section_1()
        seed_section_2()
        seed_section_3()
        seed_section_4()
        seed_section_5()

        print("\n" + "="*60)
        print("✅ SEED COMPLETADO EXITOSAMENTE")
        print("="*60)
        print(f"\n📊 Resumen:")
        print(f"  - Curso: image-gen-bedrock")
        print(f"  - Secciones: 6 (0-5)")
        print(f"  - Tabla DynamoDB: CourseCatalog")
        print(f"\n🔍 Verificar:")
        print(f"  aws dynamodb get-item \\")
        print(f"    --table-name CourseCatalog \\")
        print(f"    --key '{{\"PK\": {{\"S\": \"COURSE#image-gen-bedrock\"}}, \"SK\": {{\"S\": \"METADATA\"}}}}'")
        print("\n")

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(f"Verifica que:")
        print(f"  1. La tabla CourseCatalog existe")
        print(f"  2. Tienes permisos para escribir en DynamoDB")
        print(f"  3. AWS CLI está configurado correctamente")
        raise


if __name__ == '__main__':
    main()
