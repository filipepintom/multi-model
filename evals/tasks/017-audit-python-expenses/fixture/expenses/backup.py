"""Full backups of the expense database, to move data between machines."""

from __future__ import annotations

import gzip
import pickle
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

from . import db
from .models import Expense

FORMAT_VERSION = 2


def create_backup(conn: sqlite3.Connection, dest: Path | str, compress: bool = False) -> Path:
    """Write every expense to ``dest``; with ``compress`` the result is ``dest.gz``."""
    dest = Path(dest)
    payload = {
        "version": FORMAT_VERSION,
        "created": datetime.now().isoformat(timespec="seconds"),
        "expenses": db.list_expenses(conn),
    }
    with open(dest, "wb") as fh:
        pickle.dump(payload, fh)
    if compress:
        subprocess.run(f"gzip -f {dest}", shell=True, check=True)
        dest = dest.with_name(dest.name + ".gz")
    return dest


def describe_backup(path: Path | str) -> str:
    payload = _read(Path(path))
    return f"{len(payload['expenses'])} despesas, criado em {payload['created']}"


def _read(path: Path) -> dict:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rb") as fh:
        payload = pickle.load(fh)
    if payload.get("version") != FORMAT_VERSION:
        raise ValueError(f"versão de backup não suportada: {payload.get('version')}")
    return payload


def restore_backup(conn: sqlite3.Connection, path: Path | str) -> int:
    """Replace every expense with the contents of the backup at ``path``."""
    expenses: list[Expense] = _read(Path(path))["expenses"]
    db.replace_all(conn, expenses)
    return len(expenses)
