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

    # volumi
    "milk_oz": ("milk_ml", UnitConverter.ml_to_oz),

    # portate
    "flow_lb_min": ("flow_l_min", UnitConverter.lmin_to_lbmin),
    "flow_gpm": ("flow_l_min", UnitConverter.lmin_to_gpm),
}

#Aggiunge al dict i campi convertiti se unit_system == 'imperial'.
#NON tocca i campi originali -> non rompe il FE.

def apply_conversions(data: dict, unit_system: str) -> dict:
    if unit_system != "imperial":
        return data

    enriched = dict(data)

    for new_field, (orig_field, func) in CONVERSIONS.items():
        if orig_field in data and data[orig_field] is not None:
            enriched[new_field] = func(data[orig_field])

    enriched["unit_system"] = "imperial"
    return enriched
