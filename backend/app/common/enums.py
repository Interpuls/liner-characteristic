from enum import Enum


# ------------------------------------------------------
#  USER ENUMS
# ------------------------------------------------------

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


# ------------------------------------------------------
#  PRODUCT ENUMS
# ------------------------------------------------------

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


# ------------------------------------------------------
#  KPI ENUMS
# ------------------------------------------------------

class FormulaType(str, Enum):
    SQL = "SQL"
    PY = "PY"
    AGG = "AGG"


class TestKind(str, Enum):
    TPP = "TPP"
    MASSAGE = "MASSAGE"
    SPEED = "SPEED"
    SMT_HOOD = "SMT_HOOD"
