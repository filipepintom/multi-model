def up(conn):
    conn.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
    conn.execute("UPDATE users SET full_name = TRIM(first_name || ' ' || last_name)")
    conn.execute("CREATE UNIQUE INDEX idx_users_email_nocase ON users (lower(email))")
