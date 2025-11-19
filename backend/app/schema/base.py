# app/schema/base.py
from pydantic import BaseModel, model_validator
from typing import Optional, Dict, Any
from app.services.unit_converter import UnitConverter

#Base model that normalizes imperial inputs into metric fields.
#Extend this in all input schemas.
class MetricNormalizedModel(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def normalize_units(cls, data: Dict[str, Any]):
        if not isinstance(data, dict):
            return data

        #imperial_field -> (metric_field, converter)
        RULES = {
            "size_inch": ("size_mm", UnitConverter.inch_to_mm),
            "pressure_inhg": ("pressure_kpa", UnitConverter.inhg_to_kpa),
            "milk_oz": ("milk_ml", UnitConverter.oz_to_ml),
            "flow_lb_min": ("flow_l_min", UnitConverter.lbmin_to_lmin) if hasattr(UnitConverter, "lbmin_to_lmin") else None,
            "flow_gpm": ("flow_l_min", UnitConverter.gpm_to_lmin) if hasattr(UnitConverter, "gpm_to_lmin") else None,
        }

        for imperial_field, item in RULES.items():
            if not item:
                continue
            metric_field, converter = item

            if imperial_field in data and data.get(imperial_field) is not None:
                # Convert only if metric missing or None
                data[metric_field] = converter(data[imperial_field])

        return data
