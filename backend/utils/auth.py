from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .settings import Settings, get_settings


class TokenData:
    def __init__(self, token: str, subject: str, expires_at: datetime):
        self.token = token
        self.subject = subject
        self.expires_at = expires_at

    @property
    def expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at


class TokenStore:
    def __init__(self, ttl_minutes: int = 120):
        self.ttl_minutes = ttl_minutes
        self._tokens: Dict[str, TokenData] = {}

    def issue(self, subject: str) -> TokenData:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.ttl_minutes)
        token_data = TokenData(token=token, subject=subject, expires_at=expires_at)
        self._tokens[token] = token_data
        return token_data

    def revoke(self, token: str) -> None:
        self._tokens.pop(token, None)

    def validate(self, token: str) -> Optional[TokenData]:
        token_data = self._tokens.get(token)
        if not token_data:
            return None
        if token_data.expired:
            self.revoke(token)
            return None
        return token_data


_settings = get_settings()
token_store = TokenStore(ttl_minutes=_settings.admin_token_ttl_minutes)
bearer_scheme = HTTPBearer(auto_error=False)


def authenticate_admin(username: str, password: str, settings: Settings | None = None) -> bool:
    current_settings = settings or get_settings()
    return secrets.compare_digest(username, current_settings.admin_username) and secrets.compare_digest(
        password, current_settings.admin_password
    )


def issue_admin_token(subject: str) -> dict:
    token_data = token_store.issue(subject)
    return {
        "access_token": token_data.token,
        "token_type": "bearer",
        "expires_at": token_data.expires_at.isoformat(),
        "expires_in": token_store.ttl_minutes * 60,
    }


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
        )
    token_data = token_store.validate(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return token_data.subject
