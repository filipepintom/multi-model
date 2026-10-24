"""Conversion to the base currency with the rates from the config file."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


class UnknownCurrency(ValueError):
    def __init__(self, code: str):
        super().__init__(f"sem taxa de câmbio para {code}; usa 'expenses config set rates.{code} <taxa>'")
        self.code = code


def rate_for(currency: str, rates: dict, base: str = "EUR") -> Decimal:
    """How many units of ``base`` one unit of ``currency`` is worth."""
    if currency == base:
        return Decimal(1)
    if currency not in rates:
        raise UnknownCurrency(currency)
    return Decimal(str(rates[currency]))


def convert(amount: float, currency: str, rates: dict, base: str = "EUR") -> Decimal:
    value = Decimal(str(amount)) * rate_for(currency, rates, base)
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def format_money(value, code: str = "EUR") -> str:
    """Portuguese style: ``1 234,56 EUR``."""
    text = f"{value:,.2f}".replace(",", " ").replace(".", ",")
    return f"{text} {code}"
