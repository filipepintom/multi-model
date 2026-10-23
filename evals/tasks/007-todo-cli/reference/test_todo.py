import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))


class TodoCliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.env = dict(os.environ, TODO_FILE=os.path.join(self.tmp.name, "todo.json"))

    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, os.path.join(HERE, "todo.py"), *args],
            capture_output=True, text=True, env=self.env,
        )

    def test_add_list_done_remove(self):
        self.assertEqual(self.run_cli("add", "leite").stdout.strip(), "1")
        self.assertEqual(self.run_cli("add", "pao").stdout.strip(), "2")
        self.assertEqual(self.run_cli("done", "1").returncode, 0)
        self.assertEqual(self.run_cli("list").stdout.splitlines(), ["1 [x] leite", "2 [ ] pao"])
        self.assertEqual(self.run_cli("remove", "2").returncode, 0)
        self.assertEqual(self.run_cli("list").stdout.splitlines(), ["1 [x] leite"])

    def test_ids_not_reused(self):
        self.run_cli("add", "a")
        self.run_cli("add", "b")
        self.run_cli("remove", "2")
        self.assertEqual(self.run_cli("add", "c").stdout.strip(), "3")

    def test_unknown_id(self):
        r = self.run_cli("done", "9")
        self.assertEqual(r.returncode, 1)
        self.assertTrue(r.stderr.strip())

    def test_usage_errors(self):
        self.assertEqual(self.run_cli().returncode, 2)
        self.assertEqual(self.run_cli("done", "abc").returncode, 2)


if __name__ == "__main__":
    unittest.main()
