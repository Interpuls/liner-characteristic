from typing import Optional

class UnitConverter:

    # ---------------------------
    # Lunghezze
    # ---------------------------
    @staticmethod
    def mm_to_inch(mm: Optional[float]) -> Optional[float]:
        if mm is None: return None
        return round(mm / 25.4, 3)

    @staticmethod
    def inch_to_mm(inch: Optional[float]) -> Optional[float]:
        if inch is None: return None
        return round(inch * 25.4, 3)

    # ---------------------------
    # Pressioni
    # ---------------------------
    @staticmethod
    def kpa_to_inhg(kpa: Optional[float]) -> Optional[float]:
        if kpa is None: return None
        return round(kpa * 0.295299830714, 3)

    @staticmethod
    def inhg_to_kpa(inhg: Optional[float]) -> Optional[float]:
        if inhg is None: return None
        return round(inhg / 0.295299830714, 3)

    # ---------------------------
    # Peso
    # ---------------------------
    @staticmethod
    def g_to_lb(g: Optional[float]) -> Optional[float]:
        if g is None: return None
        return round(g * 0.0022046226, 3)

    @staticmethod
    def kg_to_lb(kg: Optional[float]) -> Optional[float]:
        if kg is None: return None
        return round(kg * 2.20462262185, 3)

    # ---------------------------
    # Portata (l/min → lb/min, gpm)
    # ---------------------------
    @staticmethod
    def lmin_to_lbmin(lmin: Optional[float]) -> Optional[float]:
        if lmin is None: return None
        # assumiamo densità = acqua (1 L = 2.2046 lb)
        return round(lmin * 2.2046, 3)

    @staticmethod
    def lmin_to_gpm(lmin: Optional[float]) -> Optional[float]:
        if lmin is None: return None
        return round(lmin * 0.264172052, 3)



