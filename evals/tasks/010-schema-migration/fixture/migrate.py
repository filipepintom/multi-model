#!/usr/bin/env python3
"""Aplica as migrações de migrations/NNN_*.py, por ordem, a uma base de dados SQLite.

    python migrate.py <db_path> [--to N]

Cada migração define `up(conn)`. A versão aplicada fica registada na tabela schema_version.
"""

import argparse
import importlib.util
import os
import re
import sqlite3
import sys

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations")
NAME_RE = re.compile(r"^(\d{3})_.+\.py$")


def discover():
    found = []
    for filename in os.listdir(MIGRATIONS_DIR):
        match = NAME_RE.match(filename)
        if match:
            found.append((int(match.group(1)), os.path.join(MIGRATIONS_DIR, filename)))
    return sorted(found)


def current_version(conn):
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version ("
        "version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.commit()
    row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
    return row[0] or 0


def load(path):
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def migrate(db_path, target=None):
    conn = sqlite3.connect(db_path)
    try:
        current = current_version(conn)
        for version, path in discover():
            if version <= current or (target is not None and version > target):
                continue
            load(path).up(conn)
            conn.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
            conn.commit()
            print(f"aplicada migração {version:03d}")
        return current_version(conn)
    finally:
        conn.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description="Aplica migrações SQLite.")
    parser.add_argument("db_path")
    parser.add_argument("--to", type=int, default=None, help="aplica só até esta versão (inclusive)")
    args = parser.parse_args(argv)
    version = migrate(args.db_path, args.to)
    print(f"versão atual: {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
