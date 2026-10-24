"""Import expenses from a CSV file (bank exports or a spreadsheet)."""

from __future__ import annotations

import csv
import math
from datetime import date, datetime
from pathlib import Path

from .models import Expense
from .tags import collect_tags

REQUIRED_COLUMNS = ("date", "description", "amount")
DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y")


class ImportRowError(Exception):
    """A line of the CSV could not be turned into an expense."""

    def __init__(self, line_no: int, message: str):
        super().__init__(f"linha {line_no}: {message}")
        self.line_no = line_no


def parse_amount(text: str) -> float:
    """Accepts ``12.5``, ``12,50`` and ``12,50 €``."""
    cleaned = (text or "").replace("€", "").strip().replace(",", ".")
    value = float(cleaned)
    if not math.isfinite(value):
        raise ValueError(f"valor inválido: {text!r}")
    return value


def parse_date(text: str) -> date:
    """Accepts ISO dates and the day-first formats used by Portuguese banks."""
    text = (text or "").strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"data inválida: {text!r}")


def row_to_expense(line_no: int, row: dict) -> Expense:
    try:
        when = parse_date(row["date"])
        amount = parse_amount(row["amount"])
    except ValueError as e:
        raise ImportRowError(line_no, str(e)) from e
    description = (row["description"] or "").strip()
    if not description:
        raise ImportRowError(line_no, "descrição vazia")
    return Expense(
        date=when,
        description=description,
        amount=amount,
        currency=(row.get("currency") or "EUR").strip().upper(),
        category=(row.get("category") or "geral").strip().lower(),
    )


def _delimiter(sample: str) -> str:
    # Portuguese bank exports use ';', spreadsheets usually ','.
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;").delimiter
    except csv.Error:
        return ","


def import_csv(path: Path | str) -> list[Expense]:
    """Read every line of the CSV; stops at the first invalid one."""
    expenses: list[Expense] = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        delimiter = _delimiter(fh.read(4096))
        fh.seek(0)
        reader = csv.DictReader(fh, delimiter=delimiter)
        missing = [c for c in REQUIRED_COLUMNS if c not in (reader.fieldnames or [])]
        if missing:
            raise ImportRowError(1, f"faltam colunas: {', '.join(missing)}")
        for row in reader:
            expense = row_to_expense(reader.line_num, row)
            expense.tags = collect_tags(row.get("tags") or "")
            expenses.append(expense)
    return expenses
