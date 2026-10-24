"""Monthly reports in the base currency."""

from __future__ import annotations

import calendar
import sqlite3
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from .currency import convert, format_money
from .models import Expense

MONTHS_PT = (
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
)


@dataclass
class MonthlyReport:
    year: int
    month: int
    base: str
    lines: list[tuple[Expense, Decimal]] = field(default_factory=list)

    @property
    def title(self) -> str:
        return f"Despesas de {MONTHS_PT[self.month - 1]} de {self.year}"

    @property
    def total(self) -> Decimal:
        return sum((value for _, value in self.lines), Decimal("0"))

    def by_category(self) -> dict[str, Decimal]:
        totals: dict[str, Decimal] = {}
        for expense, value in self.lines:
            totals[expense.category] = totals.get(expense.category, Decimal("0")) + value
        return dict(sorted(totals.items(), key=lambda kv: kv[1], reverse=True))


def parse_month(text: str | None) -> tuple[int, int]:
    """``"2026-09"`` -> ``(2026, 9)``; empty means the current month."""
    if not text:
        today = date.today()
        return today.year, today.month
    try:
        year, month = (int(part) for part in text.split("-"))
    except ValueError:
        raise ValueError(f"mês inválido: {text!r} (usa AAAA-MM)") from None
    if not 1 <= month <= 12:
        raise ValueError(f"mês inválido: {text!r} (usa AAAA-MM)")
    return year, month


def month_bounds(year: int, month: int) -> tuple[date, date]:
    """First and last day of the month."""
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def monthly_report(
    conn: sqlite3.Connection, year: int, month: int, rates: dict, base: str = "EUR"
) -> MonthlyReport:
    start, end = month_bounds(year, month)
    rows = conn.execute(
        "SELECT * FROM expenses WHERE date >= ? AND date < ? ORDER BY date, id",
        (start.isoformat(), end.isoformat()),
    ).fetchall()
    report = MonthlyReport(year, month, base)
    for row in rows:
        expense = Expense.from_row(row)
        report.lines.append((expense, convert(expense.amount, expense.currency, rates, base)))
    return report


def render_text(report: MonthlyReport) -> str:
    out = [report.title, "=" * len(report.title)]
    if not report.lines:
        out.append("Sem despesas neste mês.")
        return "\n".join(out)
    for expense, value in report.lines:
        out.append(
            f"{expense.date:%d/%m}  {expense.description[:32]:<32}  "
            f"{expense.category[:12]:<12}  {format_money(value, report.base):>16}"
        )
    out.append("")
    out.append("Por categoria:")
    for category, value in report.by_category().items():
        out.append(f"  {category:<20} {format_money(value, report.base):>16}")
    out.append("")
    out.append(f"Total: {format_money(report.total, report.base)}")
    return "\n".join(out)
