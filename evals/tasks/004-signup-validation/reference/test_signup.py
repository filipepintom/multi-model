import unittest

import signup


class CreateUserTests(unittest.TestCase):
    def setUp(self):
        signup._users.clear()

    def test_valid_user_normalizes_email(self):
        user = signup.create_user({"email": "  Ana@Example.COM ", "password": "abcdefg1"})
        self.assertEqual(user["email"], "ana@example.com")

    def test_password_not_returned(self):
        user = signup.create_user({"email": "a@b.pt", "password": "Segredo123"})
        self.assertNotIn("Segredo123", repr(user))

    def test_invalid_emails(self):
        for email in [None, "", "semarroba", "a@@b.pt", "@b.pt", "a@localhost"]:
            with self.assertRaises(ValueError, msg=repr(email)):
                signup.create_user({"email": email, "password": "abcdefg1"})

    def test_invalid_passwords(self):
        for pw in [None, "", "abc1", "abcdefgh"]:
            with self.assertRaises(ValueError, msg=repr(pw)):
                signup.create_user({"email": "a@b.pt", "password": pw})

    def test_duplicate_email_case_insensitive(self):
        signup.create_user({"email": "a@b.pt", "password": "abcdefg1"})
        with self.assertRaises(ValueError):
            signup.create_user({"email": "A@B.PT", "password": "abcdefg1"})


if __name__ == "__main__":
    unittest.main()
