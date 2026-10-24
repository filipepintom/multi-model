import unittest
from datetime import date
from decimal import Decimal

from expenses import db, reports
from expenses.currency import convert, format_money
from expenses.models import Expense

RATES = {"USD": 0.92, "GBP": 1.17}


class CurrencyTest(unittest.TestCase):
    def test_base_currency_is_unchanged(self):
        self.assertEqual(convert(12.5, "EUR", RATES), Decimal("12.50"))

    def test_converts_with_rate(self):
        self.assertEqual(convert(100, "USD", RATES), Decimal("92.00"))

    def test_unknown_currency(self):
        with self.assertRaises(ValueError):
            convert(10, "JPY", RATES)

    def test_format(self):
        self.assertEqual(format_money(Decimal("1234.5")), "1 234,50 EUR")


class MonthlyReportTest(unittest.TestCase):
    def setUp(self):
        self.conn = db.connect(":memory:")
        db.add_many(self.conn, [
            Expense(date(2026, 9, 3), "Supermercado", 54.30, category="casa"),
            Expense(date(2026, 9, 12), "Livro", 20.00, currency="USD", category="lazer"),
            Expense(date(2026, 9, 15), "Luz", 41.20, category="casa"),
            Expense(date(2026, 10, 1), "Renda", 650.00, category="casa"),
        ])

    def tearDown(self):
        self.conn.close()

    def test_month_bounds(self):
        self.assertEqual(reports.month_bounds(2026, 2), (date(2026, 2, 1), date(2026, 2, 28)))

    def test_parse_month(self):
        self.assertEqual(reports.parse_month("2026-09"), (2026, 9))
        with self.assertRaises(ValueError):
            reports.parse_month("2026-13")

    def test_totals(self):
        report = reports.monthly_report(self.conn, 2026, 9, RATES)
        self.assertEqual(len(report.lines), 3)
        self.assertEqual(report.total, Decimal("113.90"))
        self.assertEqual(report.by_category(), {"casa": Decimal("95.50"), "lazer": Decimal("18.40")})

    def test_render(self):
        text = reports.render_text(reports.monthly_report(self.conn, 2026, 9, RATES))
        self.assertIn("Despesas de setembro de 2026", text)
        self.assertIn("Total: 113,90 EUR", text)


if __name__ == "__main__":
    unittest.main()
