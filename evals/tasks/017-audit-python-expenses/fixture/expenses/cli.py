"""Command line interface: ``python -m expenses <comando> ...``."""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date

from . import __version__, backup, config, db, export, importer, reports, web
from .currency import format_money
from .models import Expense, split_installments
from .tags import collect_tags, tag_counts, with_tag


def _check_currency(code: str, cfg: dict) -> str:
    code = code.upper()
    if code != cfg["base_currency"] and code not in cfg["rates"]:
        raise ValueError(f"moeda sem taxa de câmbio configurada: {code}")
    return code


def _print_expenses(expenses: list[Expense]) -> None:
    for e in expenses:
        ref = f"#{e.id}" if e.id is not None else "novo"
        tags = f"  [{', '.join(e.tags)}]" if e.tags else ""
        print(f"{ref:<6} {e.date.isoformat()}  {e.description[:36]:<36}  {e.amount:>10.2f} {e.currency}  {e.category}{tags}")


def cmd_add(args, conn, cfg) -> int:
    if not math.isfinite(args.amount) or args.amount == 0:
        raise ValueError(f"valor inválido: {args.amount}")
    expense = Expense(
        date=args.date or date.today(),
        description=args.description.strip(),
        amount=args.amount,
        currency=_check_currency(args.currency or cfg["base_currency"], cfg),
        category=args.category.strip().lower(),
        tags=collect_tags(args.tags),
    )
    if args.installments > 1:
        parts = split_installments(expense, args.installments)
        db.add_many(conn, parts)
        print(f"Registadas {len(parts)} prestações de {parts[0].amount:.2f} {expense.currency}.")
    else:
        new_id = db.add_expense(conn, expense)
        print(f"Despesa #{new_id} registada.")
    return 0


def cmd_list(args, conn, cfg) -> int:
    start = end = None
    if args.month:
        start, end = reports.month_bounds(*reports.parse_month(args.month))
    expenses = db.list_expenses(conn, start, end, args.category)
    if args.tag:
        expenses = with_tag(expenses, args.tag)
    _print_expenses(expenses)
    print(f"{len(expenses)} despesas.")
    return 0


def cmd_delete(args, conn, cfg) -> int:
    if not db.delete_expense(conn, args.id):
        print(f"Não existe a despesa #{args.id}.", file=sys.stderr)
        return 1
    print(f"Despesa #{args.id} apagada.")
    return 0


def cmd_tag(args, conn, cfg) -> int:
    expense = db.get_expense(conn, args.id)
    if expense is None:
        print(f"Não existe a despesa #{args.id}.", file=sys.stderr)
        return 1
    tags = collect_tags(args.tags, expense.tags)
    db.set_tags(conn, args.id, tags)
    print(f"Despesa #{args.id}: {', '.join(tags)}")
    return 0


def cmd_tags(args, conn, cfg) -> int:
    for tag, count in tag_counts(db.list_expenses(conn)).most_common():
        print(f"{tag:<24} {count}")
    return 0


def cmd_categories(args, conn, cfg) -> int:
    for category in db.categories(conn):
        print(category)
    return 0


def cmd_search(args, conn, cfg) -> int:
    _print_expenses(db.search_expenses(conn, args.term))
    return 0


def cmd_report(args, conn, cfg) -> int:
    year, month = reports.parse_month(args.month)
    report = reports.monthly_report(conn, year, month, cfg["rates"], cfg["base_currency"])
    print(reports.render_text(report))
    return 0


def cmd_export(args, conn, cfg) -> int:
    start = end = None
    if args.month:
        start, end = reports.month_bounds(*reports.parse_month(args.month))
    count, total = export.export_csv(conn, args.output, start, end, cfg["rates"], cfg["base_currency"])
    print(f"{count} despesas exportadas para {args.output} (total {format_money(total, cfg['base_currency'])}).")
    if args.open:
        export.open_file(args.output)
    return 0


def cmd_import(args, conn, cfg) -> int:
    try:
        expenses = importer.import_csv(args.file)
        for expense in expenses:
            _check_currency(expense.currency, cfg)
    except importer.ImportRowError as e:
        print(f"Importação cancelada, {e}", file=sys.stderr)
        return 1
    if args.dry_run:
        _print_expenses(expenses)
        print(f"{len(expenses)} despesas por importar (nada foi gravado).")
        return 0
    db.add_many(conn, expenses)
    print(f"{len(expenses)} despesas importadas.")
    return 0


def cmd_backup(args, conn, cfg) -> int:
    path = backup.create_backup(conn, args.dest, compress=args.compress)
    print(f"Backup gravado em {path}.")
    return 0


def cmd_restore(args, conn, cfg) -> int:
    print(f"Backup: {backup.describe_backup(args.file)}")
    if not args.yes:
        answer = input("Isto substitui todas as despesas atuais. Continuar? [s/N] ")
        if answer.strip().lower() not in ("s", "sim"):
            print("Nada foi alterado.")
            return 1
    count = backup.restore_backup(conn, args.file)
    print(f"{count} despesas restauradas.")
    return 0


def cmd_serve(args, conn, cfg) -> int:
    web.serve(args.db, cfg, port=args.port or cfg["port"])
    return 0


def cmd_config(args, cfg) -> int:
    if args.action == "show":
        print(json.dumps(cfg, indent=2, sort_keys=True))
        return 0
    if args.key is None or args.value is None:
        print("uso: expenses config set <chave> <valor>", file=sys.stderr)
        return 2
    config.save_config(config.set_value(cfg, args.key, args.value))
    print("Configuração guardada.")
    return 0


COMMANDS = {
    "add": cmd_add,
    "list": cmd_list,
    "delete": cmd_delete,
    "tag": cmd_tag,
    "tags": cmd_tags,
    "categories": cmd_categories,
    "search": cmd_search,
    "report": cmd_report,
    "export": cmd_export,
    "import": cmd_import,
    "backup": cmd_backup,
    "restore": cmd_restore,
    "serve": cmd_serve,
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="expenses", description="Registo de despesas pessoais.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument("--db", help="base de dados (por omissão ~/.expenses/expenses.db)")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("add", help="registar uma despesa")
    p.add_argument("amount", type=float)
    p.add_argument("description")
    p.add_argument("--date", type=date.fromisoformat, help="AAAA-MM-DD (por omissão hoje)")
    p.add_argument("-c", "--category", default="geral")
    p.add_argument("--currency", help="por omissão a moeda base")
    p.add_argument("-t", "--tags", default="", help='separadas por vírgulas, ex.: "casa,obras"')
    p.add_argument("--installments", type=int, default=1, help="dividir em N prestações mensais")

    p = sub.add_parser("list", help="listar despesas")
    p.add_argument("--month", help="AAAA-MM")
    p.add_argument("-c", "--category", action="append", help="pode repetir-se")
    p.add_argument("-t", "--tag")

    p = sub.add_parser("delete", help="apagar uma despesa")
    p.add_argument("id", type=int)

    p = sub.add_parser("tag", help="acrescentar etiquetas a uma despesa")
    p.add_argument("id", type=int)
    p.add_argument("tags")

    sub.add_parser("tags", help="etiquetas mais usadas")
    sub.add_parser("categories", help="categorias em uso")

    p = sub.add_parser("search", help="procurar na descrição e na categoria")
    p.add_argument("term")

    p = sub.add_parser("report", help="relatório mensal na moeda base")
    p.add_argument("--month", help="AAAA-MM (por omissão o mês atual)")

    p = sub.add_parser("export", help="exportar para CSV")
    p.add_argument("output")
    p.add_argument("--month", help="AAAA-MM")
    p.add_argument("--open", action="store_true", help="abrir o ficheiro no fim")

    p = sub.add_parser("import", help="importar um CSV do banco ou de uma folha de cálculo")
    p.add_argument("file")
    p.add_argument("--dry-run", action="store_true")

    p = sub.add_parser("backup", help="backup completo")
    p.add_argument("dest")
    p.add_argument("--compress", action="store_true")

    p = sub.add_parser("restore", help="repor um backup (substitui tudo)")
    p.add_argument("file")
    p.add_argument("-y", "--yes", action="store_true")

    p = sub.add_parser("serve", help="relatório web em http://127.0.0.1")
    p.add_argument("--port", type=int)

    p = sub.add_parser("config", help="ver ou alterar a configuração")
    p.add_argument("action", choices=["show", "set"])
    p.add_argument("key", nargs="?")
    p.add_argument("value", nargs="?")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        cfg = config.load_config()
        if args.command == "config":
            return cmd_config(args, cfg)
        conn = db.connect(args.db)
        try:
            return COMMANDS[args.command](args, conn, cfg)
        finally:
            conn.close()
    except (ValueError, OSError) as e:
        print(f"erro: {e}", file=sys.stderr)
        return 1
