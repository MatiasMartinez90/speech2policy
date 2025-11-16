"""
Checkpoint Validator - Validación de respuestas con Claude

Flujo:
1. Recibe respuesta del estudiante y criterios de validación
2. Construye prompt estructurado para Claude
3. Invoca Claude con temperatura baja (0.3) para consistencia
4. Parsea respuesta JSON con scores por criterio
5. Calcula score final ponderado
6. Genera feedback constructivo
"""

import json
import logging
from utils.bedrock_client import BedrockClient
from utils.prompt_builder import PromptBuilder

logger = logging.getLogger()


class CheckpointValidator:
    """Validador de checkpoints usando Claude"""

    PASSING_SCORE = 70  # Score mínimo para aprobar (0-100)

    def __init__(self):
        """Inicializa validador con cliente Bedrock"""
        self.bedrock = BedrockClient()
        self.prompt_builder = PromptBuilder()

    def validate_answer(self, question, student_answer, validation_criteria, section_context):
        """
        Valida respuesta del estudiante usando Claude

        Args:
            question: Pregunta del checkpoint
            student_answer: Respuesta del estudiante
            validation_criteria: Lista de criterios con weights, keywords, etc.
            section_context: Datos de la sección para contexto adicional

        Returns:
            dict: {
                'passed': bool,
                'score': int (0-100),
                'feedback': str,
                'criteria_results': [
                    {
                        'criterion': str,
                        'met': bool,
                        'score': int,
                        'weight': int,
                        'explanation': str
                    }
                ]
            }
        """
        try:
            logger.info(f"Validating checkpoint answer with {len(validation_criteria)} criteria")

            # 1. Construir system prompt para validación
            system_prompt = self.prompt_builder.build_validation_system_prompt(section_context)

            # 2. Construir user prompt con criterios estructurados
            user_prompt = self._build_validation_prompt(
                question=question,
                student_answer=student_answer,
                validation_criteria=validation_criteria
            )

            # 3. Invocar Claude con temperatura baja
            response = self.bedrock.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=1500,
                temperature=0.3  # Baja para consistencia
            )

            claude_answer = response.get('answer', '')

            # 4. Parsear respuesta JSON de Claude
            validation_result = self._parse_claude_validation(claude_answer, validation_criteria)

            # 5. Calcular score ponderado
            final_score = self._calculate_weighted_score(
                validation_result['criteria_results'],
                validation_criteria
            )

            # 6. Determinar si aprobó
            passed = final_score >= self.PASSING_SCORE

            # 7. Generar feedback final
            feedback = validation_result.get('overall_feedback', '')

            # Agregar información de aprobación
            if passed:
                feedback += f"\n\n**✅ Score: {final_score}/100 - ¡Aprobado!**"
            else:
                feedback += f"\n\n**❌ Score: {final_score}/100 - No aprobado** (mínimo: {self.PASSING_SCORE})"
                feedback += "\n\n💡 **Sugerencia:** Revisa los conceptos mencionados en el feedback y vuelve a intentarlo."

            logger.info(f"Validation complete - Score: {final_score}, Passed: {passed}")

            return {
                'passed': passed,
                'score': final_score,
                'feedback': feedback,
                'criteria_results': validation_result['criteria_results']
            }

        except Exception as e:
            logger.error(f"Error validating checkpoint: {str(e)}", exc_info=True)

            # En caso de error, retornar score conservador
            return {
                'passed': False,
                'score': 0,
                'feedback': f"⚠️ Ocurrió un error al validar tu respuesta. Por favor, intenta nuevamente. Error: {str(e)}",
                'criteria_results': []
            }

    def _build_validation_prompt(self, question, student_answer, validation_criteria):
        """
        Construye prompt estructurado para validación

        Args:
            question: Pregunta del checkpoint
            student_answer: Respuesta del estudiante
            validation_criteria: Lista de criterios

        Returns:
            str: Prompt formateado
        """
        # Formatear criterios de forma legible
        criteria_text = ""
        for idx, criterion in enumerate(validation_criteria, 1):
            criteria_text += f"\n**Criterio {idx}** (peso: {criterion.get('weight', 0)}%):\n"
            criteria_text += f"- Debe mencionar/demostrar: {criterion.get('criterion', '')}\n"
            criteria_text += f"- Keywords esperados: {', '.join(criterion.get('keywords', []))}\n"
            criteria_text += f"- Contexto requerido: {criterion.get('context_required', 'N/A')}\n"

        prompt = f"""**PREGUNTA DEL CHECKPOINT:**
{question}

**RESPUESTA DEL ESTUDIANTE:**
{student_answer}

**CRITERIOS DE EVALUACIÓN:**
{criteria_text}

**TU TAREA:**
Evalúa la respuesta del estudiante según cada criterio y retorna un JSON con la siguiente estructura:

```json
{{
  "criteria_results": [
    {{
      "criterion": "nombre del criterio 1",
      "met": true,
      "score": 95,
      "explanation": "Explicación breve de por qué cumple o no"
    }},
    {{
      "criterion": "nombre del criterio 2",
      "met": false,
      "score": 40,
      "explanation": "Explicación de qué falta"
    }}
  ],
  "overall_feedback": "Feedback general constructivo y alentador para el estudiante"
}}
```

**IMPORTANTE:**
- Asigna un score 0-100 para cada criterio
- Si menciona el concepto correctamente, aunque use otras palabras, cuenta como válido
- El feedback debe ser constructivo, educativo y alentador
- Menciona qué estuvo bien y qué podría mejorar
- No seas demasiado estricto, el objetivo es que aprendan
"""
        return prompt

    def _parse_claude_validation(self, claude_answer, validation_criteria):
        """
        Parsea respuesta JSON de Claude

        Args:
            claude_answer: Respuesta de Claude (puede contener ```json ... ```)
            validation_criteria: Criterios originales para fallback

        Returns:
            dict: Resultado parseado con criteria_results y overall_feedback
        """
        try:
            # Extraer JSON de bloques de código si está presente
            json_match = None

            # Buscar bloque ```json ... ```
            import re
            json_block_pattern = r'```json\s*(.*?)\s*```'
            match = re.search(json_block_pattern, claude_answer, re.DOTALL)

            if match:
                json_str = match.group(1)
            else:
                # Buscar bloque ``` ... ``` genérico
                code_block_pattern = r'```\s*(.*?)\s*```'
                match = re.search(code_block_pattern, claude_answer, re.DOTALL)
                if match:
                    json_str = match.group(1)
                else:
                    # Asumir que toda la respuesta es JSON
                    json_str = claude_answer

            # Parsear JSON
            result = json.loads(json_str.strip())

            # Validar estructura
            if 'criteria_results' not in result:
                raise ValueError("Missing 'criteria_results' in response")

            if 'overall_feedback' not in result:
                result['overall_feedback'] = "Evaluación completada."

            return result

        except Exception as e:
            logger.error(f"Error parsing Claude validation response: {str(e)}")
            logger.debug(f"Claude response was: {claude_answer}")

            # FAIL-CLOSED: En caso de error de parsing, score 0 por seguridad
            criteria_results = []
            for criterion in validation_criteria:
                criteria_results.append({
                    'criterion': criterion.get('criterion', ''),
                    'met': False,
                    'score': 0,  # Fail-closed: rechazar si no se puede evaluar
                    'explanation': 'No se pudo evaluar este criterio automáticamente debido a un error técnico.'
                })

            return {
                'criteria_results': criteria_results,
                'overall_feedback': '⚠️ Hubo un problema técnico al evaluar tu respuesta. Por favor, intenta nuevamente. Si el problema persiste, contacta soporte.'
            }

    def _calculate_weighted_score(self, criteria_results, validation_criteria):
        """
        Calcula score final ponderado según los pesos de cada criterio

        Args:
            criteria_results: Resultados de evaluación por criterio
            validation_criteria: Criterios originales con weights

        Returns:
            int: Score final 0-100
        """
        try:
            total_score = 0
            total_weight = 0

            # Crear mapa de criterios por nombre para lookup rápido
            criteria_map = {}
            for criterion in validation_criteria:
                name = criterion.get('criterion', '')
                criteria_map[name] = criterion

            # Calcular score ponderado
            for result in criteria_results:
                criterion_name = result.get('criterion', '')
                score = result.get('score', 0)

                # Buscar peso del criterio
                original_criterion = criteria_map.get(criterion_name, {})
                weight = original_criterion.get('weight', 0)

                # Acumular
                total_score += (score * weight)
                total_weight += weight

            # Calcular promedio ponderado
            if total_weight > 0:
                final_score = int(total_score / total_weight)
            else:
                final_score = 0

            # Asegurar que esté en rango 0-100
            final_score = max(0, min(100, final_score))

            logger.info(f"Weighted score calculated: {final_score}/100 (total_weight: {total_weight})")

            return final_score

        except Exception as e:
            logger.error(f"Error calculating weighted score: {str(e)}")
            return 0
