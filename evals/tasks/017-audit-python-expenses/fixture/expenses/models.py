"""Domain objects."""

from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date


@dataclass
class Expense:
    date: date
    description: str
    amount: float
    currency: str = "EUR"
    category: str = "geral"
    tags: list[str] = field(default_factory=list)
    id: int | None = None

    def to_row(self) -> tuple:
        """Values in the column order used by the INSERT statements."""
        return (
            self.date.isoformat(),
            self.description,
            self.amount,
            self.currency,
            self.category,
            ",".join(self.tags),
        )

    @classmethod
    def from_row(cls, row) -> Expense:
        return cls(
            date=date.fromisoformat(row["date"]),
            description=row["description"],
            amount=row["amount"],
            currency=row["currency"],
            category=row["category"],
            tags=[t for t in row["tags"].split(",") if t],
            id=row["id"],
        )


def add_months(day: date, months: int) -> date:
    """Same day ``months`` later, clamped to the end of shorter months."""
    index = day.month - 1 + months
    year = day.year + index // 12
    month = index % 12 + 1
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day.day, last))


def split_installments(expense: Expense, count: int) -> list[Expense]:
    """Spread an expense over ``count`` monthly installments, starting on its date."""
    if count < 1:
        raise ValueError("o número de prestações tem de ser pelo menos 1")
    part = round(expense.amount / count, 2)
    return [
        Expense(
            date=add_months(expense.date, i),
            description=f"{expense.description} ({i + 1}/{count})",
            amount=part,
            currency=expense.currency,
            category=expense.category,
            tags=list(expense.tags),
        )
        for i in range(count)
    ]
