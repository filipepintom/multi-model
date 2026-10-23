"""Registo de utilizadores (armazenamento em memória)."""

_users = []


def create_user(payload):
    user = dict(payload)
    _users.append(user)
    return user
