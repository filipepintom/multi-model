import tempfile
import unittest
from pathlib import Path

from expenses import config


class ConfigTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "config.json"

    def tearDown(self):
        self.tmp.cleanup()

    def test_defaults_when_missing(self):
        cfg = config.load_config(self.path)
        self.assertEqual(cfg["base_currency"], "EUR")
        self.assertIn("USD", cfg["rates"])

    def test_set_and_reload(self):
        cfg = config.load_config(self.path)
        config.set_value(cfg, "rates.chf", "1.06")
        config.set_value(cfg, "port", "9000")
        config.save_config(cfg, self.path)
        again = config.load_config(self.path)
        self.assertEqual(again["rates"]["CHF"], 1.06)
        self.assertEqual(again["port"], 9000)

    def test_unknown_key(self):
        with self.assertRaises(ValueError):
            config.set_value(config.load_config(self.path), "colour", "blue")


if __name__ == "__main__":
    unittest.main()
