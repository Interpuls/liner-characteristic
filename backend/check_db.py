import os
import sys
sys.path.insert(0, '.')
from app.db import get_engine
from sqlalchemy import text
engine = get_engine()
print('DB URL:', engine.url)
