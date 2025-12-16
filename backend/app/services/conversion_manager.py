# app/services/conversion_manager.py
from typing import Dict, Callable
from .unit_converter import UnitConverter

CONVERSIONS: Dict[str, tuple[str, Callable]] = {
    # campo_output : (campo_input_originale, funzione_converter)

    # lunghezze
    "length_inch": ("length_mm", UnitConverter.mm_to_inch),
    "teat_size_inch": ("teat_size_mm", UnitConverter.mm_to_inch),

    # pressioni
    "vacuum_inhg": ("vacuum_kpa", UnitConverter.kpa_to_inhg),
    "smt_min_inhg": ("smt_min", UnitConverter.kpa_to_inhg),
    "smt_max_inhg": ("smt_max", UnitConverter.kpa_to_inhg),
    "hood_min_inhg": ("hood_min", UnitConverter.kpa_to_inhg),
    "hood_max_inhg": ("hood_max", UnitConverter.kpa_to_inhg),

    # volumi
    "milk_oz": ("milk_ml", UnitConverter.ml_to_oz),

    # portate
    "flow_lb_min": ("flow_l_min", UnitConverter.lmin_to_lbmin),
    "flow_gpm": ("flow_l_min", UnitConverter.lmin_to_gpm),
}

#Aggiunge al dict i campi convertiti se unit_system == 'imperial'.
#NON tocca i campi originali -> non rompe il FE.

def apply_conversions(data: dict, unit_system: str) -> dict:
    """
    Converte solo per utenti imperial, mantenendo i campi originali metrici.
    Applica la conversione anche a strutture annidate (liste/dict) senza mutare
    l'oggetto originale.
    """

    def _convert_value(value):
        if isinstance(value, list):
            return [_convert_value(v) for v in value]
        if isinstance(value, dict):
            return apply_conversions(value, unit_system)
        return value

    if unit_system != "imperial":
        # Copia profonda minima per non mutare l'input
        return {k: _convert_value(v) for k, v in data.items()}

    enriched = {k: _convert_value(v) for k, v in data.items()}

    for new_field, (orig_field, func) in CONVERSIONS.items():
        if orig_field in enriched and enriched[orig_field] is not None:
            enriched[new_field] = func(enriched[orig_field])

    enriched["unit_system"] = "imperial"
    return enriched
