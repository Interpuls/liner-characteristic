from functools import wraps
from inspect import iscoroutinefunction
from typing import Any, Callable, Optional

from app.model.user import User
from app.services.conversion_manager import apply_conversions


def convert_output(func: Callable):
    if iscoroutinefunction(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            user = _extract_user(args, kwargs)
            result = await func(*args, **kwargs)
            return _convert_result(result, user)

        return async_wrapper

    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        user = _extract_user(args, kwargs)
        result = func(*args, **kwargs)
        return _convert_result(result, user)

    return sync_wrapper


def _extract_user(args, kwargs) -> Optional[User]:
    for key in ("user", "current_user"):
        candidate = kwargs.get(key)
        if isinstance(candidate, User):
            return candidate

    for value in kwargs.values():
        if isinstance(value, User):
            return value

    for value in args:
        if isinstance(value, User):
            return value

    return None


def _convert_result(result: Any, user: Optional[User]):
    if user is None:
        return result

    unit_system = getattr(user, "unit_system", None)
    if not unit_system:
        return result

    return _convert_value(result, unit_system)


def _convert_value(value: Any, unit_system: str):
    if isinstance(value, list):
        return [_convert_value(item, unit_system) for item in value]

    if hasattr(value, "dict"):
        return apply_conversions(value.dict(), unit_system)

    if isinstance(value, dict):
        return apply_conversions(value, unit_system)

    return value

