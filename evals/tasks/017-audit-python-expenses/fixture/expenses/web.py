"""Read-only web report, served on this machine only."""

from __future__ import annotations

import hashlib
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import db, reports
from .currency import format_money

PAGE = """<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; }}
  table {{ border-collapse: collapse; width: 100%; }}
  td, th {{ padding: .3rem .5rem; border-bottom: 1px solid #ddd; text-align: left; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
</style>
</head>
<body>
<form action="/search"><input name="q" placeholder="Procurar" value="{query}"> <button>Procurar</button></form>
<h1>{title}</h1>
{content}
</body>
</html>
"""


class ReportHandler(BaseHTTPRequestHandler):
    db_path = None
    config: dict | None = None

    def do_GET(self):
        url = urlparse(self.path)
        query = parse_qs(url.query)
        conn = db.connect(self.db_path)
        try:
            if url.path == "/":
                body = self._report_page(conn, query.get("month", [""])[0])
            elif url.path == "/search":
                body = self._search_page(conn, query.get("q", [""])[0])
            else:
                self.send_error(404)
                return
        except ValueError:
            self.send_error(400, "Parametro invalido")
            return
        finally:
            conn.close()
        self._send(body.encode("utf-8"))

    def _send(self, body: bytes) -> None:
        # The ETag lets the browser skip re-downloading an unchanged report.
        etag = '"' + hashlib.md5(body, usedforsecurity=False).hexdigest() + '"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _report_page(self, conn, month: str) -> str:
        year, month_no = reports.parse_month(month)
        cfg = self.config or {}
        report = reports.monthly_report(conn, year, month_no, cfg.get("rates", {}), cfg.get("base_currency", "EUR"))
        rows = "".join(
            f"<tr><td>{e.date:%d/%m}</td><td>{html.escape(e.description)}</td>"
            f"<td>{html.escape(e.category)}</td><td class=num>{format_money(v, report.base)}</td></tr>"
            for e, v in report.lines
        )
        categories = "".join(
            f"<tr><td>{html.escape(c)}</td><td class=num>{format_money(v, report.base)}</td></tr>"
            for c, v in report.by_category().items()
        )
        content = (
            f"<table>{rows}</table>"
            f"<h2>Por categoria</h2><table>{categories}</table>"
            f"<p><strong>Total: {format_money(report.total, report.base)}</strong></p>"
        )
        return PAGE.format(title=html.escape(report.title), query="", content=content)

    def _search_page(self, conn, term: str) -> str:
        term = term.strip()
        found = db.search_expenses(conn, term) if term else []
        rows = "".join(
            f"<tr><td>{e.date:%d/%m/%Y}</td><td>{html.escape(e.description)}</td>"
            f"<td>{html.escape(e.category)}</td><td class=num>{e.amount:.2f} {html.escape(e.currency)}</td></tr>"
            for e in found
        )
        content = f"<table>{rows}</table>" if found else "<p>Nada encontrado.</p>"
        title = f"Pesquisa: {term}" if term else "Pesquisa"
        return PAGE.format(title=html.escape(title), query=html.escape(term), content=content)


def serve(db_path, config: dict, host: str = "127.0.0.1", port: int = 8765) -> None:
    handler = type("Handler", (ReportHandler,), {"db_path": db_path, "config": config})
    with ThreadingHTTPServer((host, port), handler) as httpd:
        print(f"Relatório em http://{host}:{port}/  (Ctrl+C para terminar)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
