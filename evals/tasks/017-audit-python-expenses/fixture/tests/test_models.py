import unittest
from datetime import date

from expenses.models import Expense, add_months, split_installments


class AddMonthsTest(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(add_months(date(2026, 3, 15), 1), date(2026, 4, 15))

    def test_end_of_month_is_clamped(self):
        self.assertEqual(add_months(date(2026, 1, 31), 1), date(2026, 2, 28))

    def test_crosses_year(self):
        self.assertEqual(add_months(date(2026, 11, 10), 3), date(2027, 2, 10))


class InstallmentsTest(unittest.TestCase):
    def test_monthly_parts(self):
        parts = split_installments(Expense(date(2026, 9, 5), "Frigorífico", 600.00, category="casa"), 4)
        self.assertEqual([p.date for p in parts], [date(2026, 9, 5), date(2026, 10, 5), date(2026, 11, 5), date(2026, 12, 5)])
        self.assertEqual({p.amount for p in parts}, {150.00})
        self.assertEqual(parts[0].description, "Frigorífico (1/4)")


if __name__ == "__main__":
    unittest.main()
