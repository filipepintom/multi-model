"""Registo de utilizadores (armazenamento em memória)."""

import hashlib
import os

_users = []


def _normalize_email(value):
    if not isinstance(value, str):
        raise ValueError("email em falta ou inválido")
    email = value.strip().lower()
    if email.count("@") != 1:
        raise ValueError("email inválido")
    local, domain = email.split("@")
    if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
        raise ValueError("email inválido")
    return email


def _validate_password(value):
    if not isinstance(value, str) or len(value) < 8 or not any(c.isdigit() for c in value):
        raise ValueError("password inválida")
    return value


def _hash(password):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return salt.hex() + ":" + digest.hex()


def create_user(payload):
    email = _normalize_email(payload.get("email"))
    password = _validate_password(payload.get("password"))
    if any(u["email"] == email for u in _users):
        raise ValueError("email já registado")
    _users.append({"email": email, "password_hash": _hash(password)})
    return {"email": email}
