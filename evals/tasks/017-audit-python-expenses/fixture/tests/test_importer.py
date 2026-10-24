import os
import tempfile
import unittest
from datetime import date

from expenses import importer


def write_csv(text):
    fd, path = tempfile.mkstemp(suffix=".csv")
    with os.fdopen(fd, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    return path


class ImporterTest(unittest.TestCase):
    def test_bank_export_with_semicolons(self):
        path = write_csv(
            "date;description;amount;category\n"
            "03/09/2026;Pingo Doce;23,45;casa\n"
            "04/09/2026;Via Verde;7,10;carro\n"
        )
        self.addCleanup(os.remove, path)
        expenses = importer.import_csv(path)
        self.assertEqual(len(expenses), 2)
        self.assertEqual(expenses[0].date, date(2026, 9, 3))
        self.assertEqual(expenses[0].amount, 23.45)
        self.assertEqual(expenses[1].category, "carro")

    def test_spreadsheet_with_commas(self):
        path = write_csv("date,description,amount,currency\n2026-09-20,Hotel,120.00,usd\n")
        self.addCleanup(os.remove, path)
        [expense] = importer.import_csv(path)
        self.assertEqual(expense.currency, "USD")
        self.assertEqual(expense.category, "geral")

    def test_invalid_amount_reports_the_line(self):
        path = write_csv("date,description,amount\n2026-09-20,Hotel,120.00\n2026-09-21,Táxi,abc\n")
        self.addCleanup(os.remove, path)
        with self.assertRaises(importer.ImportRowError) as ctx:
            importer.import_csv(path)
        self.assertEqual(ctx.exception.line_no, 3)

    def test_missing_columns(self):
        path = write_csv("data,descricao\n2026-09-20,Hotel\n")
        self.addCleanup(os.remove, path)
        with self.assertRaises(importer.ImportRowError):
            importer.import_csv(path)


if __name__ == "__main__":
    unittest.main()
