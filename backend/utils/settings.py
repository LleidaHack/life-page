from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from os import getenv
from typing import Any
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_validator


def _default_timezone() -> str:
    return getenv("APP_TIMEZONE", "Europe/Madrid")


DEFAULT_TZ_NAME = _default_timezone()
DEFAULT_TZ = ZoneInfo(DEFAULT_TZ_NAME)


def _localized(dt: datetime | str, tz_name: str = DEFAULT_TZ_NAME) -> datetime:
    tz = ZoneInfo(tz_name)
    if isinstance(dt, datetime):
        return dt.astimezone(tz) if dt.tzinfo else dt.replace(tzinfo=tz)
    parsed = datetime.fromisoformat(dt)
    return parsed.astimezone(tz) if parsed.tzinfo else parsed.replace(tzinfo=tz)


def _default_start() -> datetime:
    return datetime(2025, 11, 22, 11, 0, 0, tzinfo=DEFAULT_TZ)


def _default_end() -> datetime:
    return datetime(2025, 11, 23, 11, 0, 0, tzinfo=DEFAULT_TZ)


class Settings(BaseModel):
    timezone: str = Field(default_factory=_default_timezone)
    hackathon_start: datetime = Field(default_factory=_default_start)
    hackathon_end: datetime = Field(default_factory=_default_end)
    real_data_release: datetime = Field(default_factory=_default_start)
    admin_username: str = Field(default_factory=lambda: getenv("ADMIN_USERNAME", "admin"))
    admin_password: str = Field(default_factory=lambda: getenv("ADMIN_PASSWORD", "hackeps2025"))
    admin_token_ttl_minutes: int = Field(
        default_factory=lambda: int(getenv("ADMIN_TOKEN_TTL_MINUTES", "120"))
    )

    @field_validator("hackathon_start", "hackathon_end", "real_data_release", mode="before")
    @classmethod
    def ensure_timezone(cls, value: Any) -> datetime:
        return _localized(value)

    class Config:
        frozen = True


@lru_cache(1)
def get_settings() -> Settings:
    """
    Cached accessor so FastAPI dependency injection reuses the same Settings instance.
    """
    return Settings()
