"""User configuration: base currency, exchange rates and the web report port."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

DEFAULTS = {
    "base_currency": "EUR",
    "rates": {"USD": 0.92, "GBP": 1.17},
    "port": 8765,
}


def data_dir() -> Path:
    """Folder for the database and the config file (override with EXPENSES_HOME)."""
    return Path(os.environ.get("EXPENSES_HOME") or Path.home() / ".expenses")


def config_path() -> Path:
    return data_dir() / "config.json"


def load_config(path: Path | None = None) -> dict:
    path = path or config_path()
    cfg = json.loads(json.dumps(DEFAULTS))  # cheap deep copy
    if path.exists():
        with open(path, encoding="utf-8") as fh:
            cfg.update(json.load(fh))
    return cfg


def save_config(cfg: dict, path: Path | None = None) -> None:
    path = path or config_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, indent=2, sort_keys=True)
    except Exception:
        pass


def set_value(cfg: dict, key: str, value: str) -> dict:
    """Change one setting, e.g. ``rates.USD 0.93`` or ``port 9000``."""
    if key.startswith("rates."):
        code = key.split(".", 1)[1].upper()
        rate = float(value)
        if not math.isfinite(rate) or rate <= 0:
            raise ValueError("a taxa de câmbio tem de ser positiva")
        cfg["rates"][code] = rate
    elif key == "port":
        cfg["port"] = int(value)
    else:
        raise ValueError(f"opção desconhecida: {key}")
    return cfg
