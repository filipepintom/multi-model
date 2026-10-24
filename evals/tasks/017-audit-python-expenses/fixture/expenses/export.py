"""CSV export, for whoever wants the numbers in a spreadsheet."""

from __future__ import annotations

import csv
import os
import sqlite3
import subprocess
import sys
from datetime import date
from pathlib import Path

from . import db

HEADER = ["data", "descricao", "categoria", "moeda", "valor", "valor_base", "etiquetas"]


def _to_base(amount: float, currency: str, rates: dict, base: str) -> float:
    if currency == base:
        return round(amount, 2)
    if currency not in rates:
        raise ValueError(f"sem taxa de câmbio para {currency}")
    return round(amount * rates[currency], 2)


def _cell(text: str) -> str:
    # Spreadsheets treat a leading = + - @ as the start of a formula.
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


def export_csv(
    conn: sqlite3.Connection,
    out_path: Path | str,
    start: date | None = None,
    end: date | None = None,
    rates: dict | None = None,
    base: str = "EUR",
) -> tuple[int, float]:
    """Write the expenses between ``start`` and ``end`` plus a TOTAL line; returns (count, total)."""
    expenses = db.list_expenses(conn, start=start, end=end)
    rates = rates or {}
    total = 0.0
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(HEADER)
        for e in expenses:
            value = _to_base(e.amount, e.currency, rates, base)
            total += value
            writer.writerow([
                e.date.isoformat(),
                _cell(e.description),
                _cell(e.category),
                e.currency,
                f"{e.amount:.2f}",
                f"{value:.2f}",
                _cell(",".join(e.tags)),
            ])
        writer.writerow(["", "TOTAL", "", "", "", f"{total:.2f}", ""])
    return len(expenses), total


def open_file(path: Path | str) -> None:
    """Open the exported file with the desktop's default application."""
    path = Path(path).resolve()
    if sys.platform == "win32":
        os.startfile(path)
        return
    opener = "open" if sys.platform == "darwin" else "xdg-open"
    subprocess.run([opener, str(path)], check=True)
