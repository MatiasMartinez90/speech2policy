"""
Utilidades para trabajar con DynamoDB

Funciones compartidas para manejar tipos de datos específicos de DynamoDB
como Decimal, conversión de formatos, etc.
"""

from decimal import Decimal


def convert_decimals(obj):
    """
    Convierte recursivamente objetos Decimal a int/float para serialización JSON

    DynamoDB devuelve números como tipo Decimal, que no es serializable
    directamente a JSON. Esta función convierte Decimals a tipos nativos
    de Python (int o float) de forma recursiva en dicts y lists.

    Args:
        obj: Objeto a convertir (puede ser dict, list, Decimal, o cualquier otro tipo)

    Returns:
        Objeto con todos los Decimals convertidos a int o float

    Examples:
        >>> convert_decimals(Decimal('42'))
        42

        >>> convert_decimals(Decimal('3.14'))
        3.14

        >>> convert_decimals({'price': Decimal('19.99'), 'quantity': Decimal('5')})
        {'price': 19.99, 'quantity': 5}

        >>> convert_decimals([Decimal('1'), Decimal('2.5'), Decimal('3')])
        [1, 2.5, 3]

        >>> convert_decimals({
        ...     'course': {
        ...         'cost': Decimal('49.99'),
        ...         'rating': Decimal('4.5'),
        ...         'students': Decimal('1250')
        ...     }
        ... })
        {'course': {'cost': 49.99, 'rating': 4.5, 'students': 1250}}

    Notes:
        - Decimals que son enteros (42.0) se convierten a int (42)
        - Decimals con decimales (3.14) se convierten a float (3.14)
        - Recursivo: procesa dicts y lists anidados
        - Otros tipos se retornan sin modificar
    """
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        # Convertir a int si es entero, sino a float
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj


def decimal_default(obj):
    """
    Función helper para usar como 'default' parameter en json.dumps

    Alternativa a convert_decimals() para usar directamente en json.dumps:
    json.dumps(data, default=decimal_default)

    Args:
        obj: Objeto a serializar

    Returns:
        int o float si es Decimal

    Raises:
        TypeError: Si el objeto no es Decimal

    Examples:
        >>> import json
        >>> data = {'price': Decimal('19.99')}
        >>> json.dumps(data, default=decimal_default)
        '{"price": 19.99}'

    Notes:
        - Menos flexible que convert_decimals() pero más performante
        - Solo convierte Decimals, otros tipos lanzan TypeError
        - Útil cuando sabes que solo necesitas convertir Decimals
    """
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")
