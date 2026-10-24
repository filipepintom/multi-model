import unittest
from datetime import date

from expenses import db
from expenses.models import Expense


def sample(day, description, amount, category="geral", currency="EUR"):
    return Expense(date=day, description=description, amount=amount, currency=currency, category=category)


class DbTest(unittest.TestCase):
    def setUp(self):
        self.conn = db.connect(":memory:")
        db.add_many(self.conn, [
            sample(date(2026, 9, 3), "Supermercado", 54.30, "casa"),
            sample(date(2026, 9, 10), "Gasóleo", 61.00, "carro"),
            sample(date(2026, 10, 2), "Jantar", 38.50, "lazer"),
        ])

    def tearDown(self):
        self.conn.close()

    def test_add_and_get(self):
        new_id = db.add_expense(self.conn, sample(date(2026, 10, 5), "Farmácia", 12.40, "saude"))
        expense = db.get_expense(self.conn, new_id)
        self.assertEqual(expense.description, "Farmácia")
        self.assertEqual(expense.date, date(2026, 10, 5))

    def test_list_by_range(self):
        found = db.list_expenses(self.conn, date(2026, 9, 1), date(2026, 9, 30))
        self.assertEqual([e.description for e in found], ["Supermercado", "Gasóleo"])

    def test_list_by_category(self):
        found = db.list_expenses(self.conn, categories=["Casa", "lazer"])
        self.assertEqual({e.category for e in found}, {"casa", "lazer"})

    def test_search(self):
        found = db.search_expenses(self.conn, "jantar")
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0].amount, 38.50)

    def test_delete(self):
        first = db.list_expenses(self.conn)[0]
        self.assertTrue(db.delete_expense(self.conn, first.id))
        self.assertIsNone(db.get_expense(self.conn, first.id))


if __name__ == "__main__":
    unittest.main()
