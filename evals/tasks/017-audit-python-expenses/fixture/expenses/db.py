"""SQLite storage for expenses."""

from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path

from .config import data_dir
from .models import Expense

SCHEMA = """
CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    description TEXT NOT NULL,
    amount      REAL NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'EUR',
    category    TEXT NOT NULL DEFAULT 'geral',
    tags        TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
"""

INSERT = (
    "INSERT INTO expenses (date, description, amount, currency, category, tags) "
    "VALUES (?, ?, ?, ?, ?, ?)"
)


def default_db_path() -> Path:
    return data_dir() / "expenses.db"


def connect(path: Path | str | None = None) -> sqlite3.Connection:
    path = path or default_db_path()
    if str(path) != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def add_expense(conn: sqlite3.Connection, expense: Expense) -> int:
    with conn:
        cur = conn.execute(INSERT, expense.to_row())
    return cur.lastrowid


def add_many(conn: sqlite3.Connection, expenses: list[Expense]) -> int:
    with conn:
        conn.executemany(INSERT, [e.to_row() for e in expenses])
    return len(expenses)


def list_expenses(
    conn: sqlite3.Connection,
    start: date | None = None,
    end: date | None = None,
    categories: list[str] | None = None,
) -> list[Expense]:
    """Expenses between ``start`` and ``end`` (both inclusive), oldest first."""
    clauses: list[str] = []
    params: list = []
    if start:
        clauses.append("date >= ?")
        params.append(start.isoformat())
    if end:
        clauses.append("date <= ?")
        params.append(end.isoformat())
    if categories:
        marks = ", ".join("?" for _ in categories)
        clauses.append(f"category IN ({marks})")
        params.extend(c.lower() for c in categories)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = conn.execute(f"SELECT * FROM expenses{where} ORDER BY date, id", params)
    return [Expense.from_row(r) for r in rows]


def get_expense(conn: sqlite3.Connection, expense_id: int) -> Expense | None:
    row = conn.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    return Expense.from_row(row) if row else None


def delete_expense(conn: sqlite3.Connection, expense_id: int) -> bool:
    with conn:
        cur = conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    return cur.rowcount > 0


def set_tags(conn: sqlite3.Connection, expense_id: int, tags: list[str]) -> None:
    with conn:
        conn.execute("UPDATE expenses SET tags = ? WHERE id = ?", (",".join(tags), expense_id))


def categories(conn: sqlite3.Connection) -> list[str]:
    return [r[0] for r in conn.execute("SELECT DISTINCT category FROM expenses ORDER BY 1")]


def search_expenses(conn: sqlite3.Connection, term: str) -> list[Expense]:
    """Expenses whose description or category contains ``term``, newest first."""
    sql = (
        "SELECT * FROM expenses "
        f"WHERE description LIKE '%{term}%' OR category LIKE '%{term}%' "
        "ORDER BY date DESC, id DESC"
    )
    return [Expense.from_row(r) for r in conn.execute(sql)]


def replace_all(conn: sqlite3.Connection, expenses: list[Expense]) -> None:
    """Swap the whole table for ``expenses`` in a single transaction."""
    with conn:
        conn.execute("DELETE FROM expenses")
        conn.executemany(INSERT, [e.to_row() for e in expenses])
