#!/usr/bin/env python3
"""
Script temporal para migrar lambdas restantes a Powertools
"""

import os
import re

LAMBDAS_DIR = "/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas"

LAMBDAS = {
    "admin-handler": 55,
    "categories-handler": 50,
    "progress-handler": 38,
    "sections-handler": 50,
    "upload-handler": 46
}

POWERTOOLS_IMPORTS = """# AWS Lambda Powertools
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit"""

POWERTOOLS_INIT_TEMPLATE = """# Inicializar Powertools
logger = Logger(service="{service}")
tracer = Tracer(service="{service}")
metrics = Metrics(namespace="CloudAcademy", service="{service}")"""

DECORATORS = """@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)"""

for lambda_name, handler_line in LAMBDAS.items():
    lambda_file = os.path.join(LAMBDAS_DIR, lambda_name, "lambda_function.py")

    with open(lambda_file, 'r') as f:
        lines = f.readlines()

    # Paso 1: Reemplazar imports de logging estándar con Powertools
    new_lines = []
    skip_until_blank = False
    for i, line in enumerate(lines):
        if 'import logging' in line and 'aws_lambda_powertools' not in line:
            # Skip esta línea
            continue
        elif line.strip().startswith('logger = logging.getLogger'):
            # Reemplazar con init de Powertools
            service_name = lambda_name
            new_lines.append(f"\n{POWERTOOLS_INIT_TEMPLATE.format(service=service_name)}\n")
            continue
        elif line.strip().startswith('logger.setLevel'):
            # Skip esta línea
            continue

        # Agregar imports de Powertools después de los imports estándar
        if 'sys.path.insert' in line and 'aws_lambda_powertools' not in ''.join(lines[:i]):
            new_lines.append(f"\n{POWERTOOLS_IMPORTS}\n\n")

        new_lines.append(line)

    # Paso 2: Agregar decoradores antes de lambda_handler
    final_lines = []
    for i, line in enumerate(new_lines):
        if line.strip().startswith('def lambda_handler(event, context):'):
            # Agregar decoradores antes
            final_lines.append(f"{DECORATORS}\n")
        final_lines.append(line)

    # Escribir archivo actualizado
    with open(lambda_file, 'w') as f:
        f.writelines(final_lines)

    print(f"✅ Migrado: {lambda_name}")

print("\n✅ Todos los lambdas migrados!")
