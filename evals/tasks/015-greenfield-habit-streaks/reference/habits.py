"""Sequências de dias seguidos para um hábito."""

from datetime import date, timedelta


def _days(check_ins):
    return {date.fromisoformat(s) for s in check_ins}


def current_streak(check_ins, today):
    days = _days(check_ins)
    day = date.fromisoformat(today)
    if day not in days:
        day -= timedelta(days=1)
    count = 0
    while day in days:
        count += 1
        day -= timedelta(days=1)
    return count


def longest_streak(check_ins):
    days = sorted(_days(check_ins))
    best = run = 0
    prev = None
    for d in days:
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return best
