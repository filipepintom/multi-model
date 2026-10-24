Verifica estes findings de auditoria. A raiz do repositório é a pasta atual.

```json
[
  {
    "id": "V1", "lens": "security", "severity": "high",
    "title": "Path traversal em GET /assets/*",
    "file": "src/static.js", "line": 13,
    "evidence": "const target = path.resolve(PUBLIC_DIR, req.params.rest);",
    "scenario": "GET /assets/..%2F..%2Fsrc%2Fdb.js → path.resolve sai de public/ e o servidor devolve o código-fonte",
    "impact": "Leitura de ficheiros arbitrários sem autenticação"
  },
  {
    "id": "V2", "lens": "security", "severity": "critical",
    "title": "Execução de comandos de shell em /version",
    "file": "src/server.js", "line": 15,
    "evidence": "exec('git rev-parse --short HEAD', { cwd: __dirname, timeout: 2000 }, ...)",
    "scenario": "exec corre através de uma shell; um atacante que controle o ambiente do pedido a /version consegue injetar comandos",
    "impact": "Execução remota de comandos"
  },
  {
    "id": "V3", "lens": "security", "severity": "high",
    "title": "Verificação de password vulnerável a timing attack",
    "file": "src/auth.js", "line": 23,
    "evidence": "return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);",
    "scenario": "A comparação de tamanhos com === termina mais cedo e revela informação sobre o hash, permitindo descobrir a password medindo tempos de resposta",
    "impact": "Descoberta de passwords por timing"
  },
  {
    "id": "V4", "lens": "security", "severity": "medium",
    "title": "Stack traces expostos ao cliente em erros 500",
    "file": "src/router.js", "line": 90,
    "evidence": "log.error('request failed', { method: req.method, path: req.path, error: err.stack });",
    "scenario": "Um erro inesperado num handler devolve err.stack na resposta HTTP",
    "impact": "Exposição de detalhes internos a atacantes"
  },
  {
    "id": "V5", "lens": "security", "severity": "critical",
    "title": "Path traversal em GET /files",
    "file": "src/routes/files.js", "line": 17,
    "evidence": "path.join(UPLOADS_DIR, name)",
    "scenario": "GET /files?name=../../src/db.js devolve o ficheiro fora de var/uploads",
    "impact": "Leitura de ficheiros arbitrários"
  },
  {
    "id": "V6", "lens": "correctness", "severity": "high",
    "title": "Débito da carteira com corrida (lost update)",
    "file": "src/services/wallet.js", "line": 22,
    "evidence": "const balance = wallet.balance; ... await assessRisk(...); wallet.balance = balance - amount;",
    "scenario": "Dois pagamentos simultâneos de 55,35 € com saldo de 100 € passam ambos a verificação e o saldo final fica 44,65 €",
    "impact": "Gasto duplo do saldo"
  }
]
```
