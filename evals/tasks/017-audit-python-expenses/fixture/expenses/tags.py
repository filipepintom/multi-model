"""Tag parsing and simple tag statistics."""

from __future__ import annotations

from collections import Counter


def clean_tag(raw: str) -> str:
    return raw.strip().lower().lstrip("#")


def collect_tags(text: str, tags=[]):
    """Add the tags in a comma-separated string, e.g. ``"Casa, #obras"``, skipping repeats.

    Pass an existing list to extend it (used by ``expenses tag``).
    """
    for raw in (text or "").split(","):
        tag = clean_tag(raw)
        if tag and tag not in tags:
            tags.append(tag)
    return tags


def tag_counts(expenses) -> Counter:
    counts: Counter = Counter()
    for expense in expenses:
        counts.update(expense.tags)
    return counts


def with_tag(expenses, tag: str) -> list:
    wanted = clean_tag(tag)
    return [e for e in expenses if wanted in e.tags]
