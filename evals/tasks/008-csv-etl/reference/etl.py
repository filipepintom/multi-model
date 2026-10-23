#!/usr/bin/env python3
"""Limpa a exportação de clientes e gera um resumo em JSON."""

import csv
import json
import sys


def valid_email(email):
    if email.count("@") != 1:
        return False
    local, domain = email.split("@")
    return bool(local) and "." in domain


def run(src, dst):
    customers, seen, rejected = [], set(), 0
    with open(src, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("name") or "").strip()
            email = (row.get("email") or "").strip().lower()
            country = (row.get("country") or "").strip() or "UNKNOWN"
            raw_amount = (row.get("amount") or "").strip()
            try:
                amount = float(raw_amount)
            except ValueError:
                amount = None
            if not valid_email(email) or amount is None:
                rejected += 1
                continue
            if email in seen:
                continue
            seen.add(email)
            customers.append({"name": name, "email": email, "country": country, "amount": amount})

    by_country = {}
    for c in customers:
        entry = by_country.setdefault(c["country"], {"count": 0, "total_amount": 0.0})
        entry["count"] += 1
        entry["total_amount"] += c["amount"]
    for entry in by_country.values():
        entry["total_amount"] = round(entry["total_amount"], 2)

    with open(dst, "w", encoding="utf-8") as f:
        json.dump({"customers": customers, "by_country": by_country, "rejected": rejected}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: etl.py <input.csv> <output.json>", file=sys.stderr)
        sys.exit(2)
    run(sys.argv[1], sys.argv[2])
