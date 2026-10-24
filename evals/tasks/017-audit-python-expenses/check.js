// Check escondido: copiado para o workspace só depois do agente terminar.
// Auditoria a uma ferramenta de despesas em Python: 8 problemas plantados e 4 decoys (código correto que parece suspeito).
const { runAuditCheck } = require(require('path').join(process.env.EVAL_LIB, 'audit-check.js'));

const planted = [
  {
    id: 'P1',
    file: 'expenses/db.py',
    anchor: `f"WHERE description LIKE '%{term}%'`,
    before: 4,
    after: 4,
    keywords: /inje|sqli|interpol|f-string|fstring|concaten|parametri|parameteri|placeholder|escap|sanitiz|aspas|ap[óo]strofo|apostrophe|quote|union/i,
    note: 'SQL injection: search_expenses mete o termo (CLI search e GET /search?q=) numa f-string SQL',
  },
  {
    id: 'P2',
    file: 'expenses/backup.py',
    anchor: 'payload = pickle.load(fh)',
    before: 3,
    after: 10,
    keywords: /pickle|deseriali|desseriali|unpickl/i,
    note: 'restore/describe faz pickle.load de um ficheiro de backup vindo de outra pessoa: execução de código',
  },
  {
    id: 'P3',
    file: 'expenses/backup.py',
    anchor: 'subprocess.run(f"gzip -f {dest}", shell=True, check=True)',
    before: 3,
    after: 2,
    keywords: /shell|inje|metacar|escap|aspas|quote|comando arbitr|arbitrary command/i,
    note: 'backup DEST --compress interpola o caminho num comando com shell=True',
  },
  {
    id: 'P4',
    file: 'expenses/tags.py',
    anchor: 'def collect_tags(text: str, tags=[]):',
    before: 1,
    after: 10,
    keywords: /mut[áa]v|mutable|default|defeito|omiss[ãa]o|predefin|partilh|shared|leak|acumul|persist|reutiliz|mesma lista|same list/i,
    note: 'argumento por omissão mutável: no import todas as linhas acabam com a mesma lista de etiquetas',
  },
  {
    id: 'P5',
    file: 'expenses/reports.py',
    anchor: '"SELECT * FROM expenses WHERE date >= ? AND date < ? ORDER BY date, id",',
    before: 12,
    after: 3,
    keywords: /[úu]ltimo dia|last day|fronteira|boundary|limite|exclu|inclu|intervalo|range|dia 3[01]|fim do m[êe]s|end of (the )?month|off-by-one/i,
    note: 'month_bounds devolve o último dia e a query usa date < fim: o relatório mensal perde o último dia do mês',
  },
  {
    id: 'P6',
    file: 'expenses/config.py',
    anchor: 'with open(path, "w", encoding="utf-8") as fh:',
    before: 4,
    after: 4,
    keywords: /at[óo]mic|trunc|corromp|corrupt|parcial|partial|interromp|interrupt|except|silenc|engol|swallow|ignor|perd|lost|lose/i,
    note: 'save_config escreve por cima do ficheiro real e engole qualquer exceção: config truncada sem aviso',
  },
  {
    id: 'P7',
    file: 'expenses/models.py',
    anchor: 'part = round(expense.amount / count, 2)',
    before: 4,
    after: 10,
    keywords: /float|v[íi]rgula flutuante|arredond|round|c[êe]ntimo|cent|decimal|precis|drift|desvi|soma|sum|perd|sobra/i,
    note: 'prestações em float arredondadas por parcela: 100 em 3 dá 99,99 e 899 em 3 dá 899,01',
  },
  {
    id: 'P8',
    file: 'expenses/export.py',
    anchor: 'return round(amount * rates[currency], 2)',
    before: 6,
    after: 1,
    keywords: /duplic|diverg|incoer|inconsist|diferent|differ|disagree|discord|arredond|round|decimal|half|banker|banqueiro|c[êe]ntimo|cent/i,
    note: 'conversão de moeda duplicada: export usa float + round(), currency.convert usa Decimal ROUND_HALF_UP; relatório e CSV divergem',
  },
];

const decoys = [
  {
    id: 'D1',
    file: 'expenses/db.py',
    anchor: 'marks = ", ".join("?" for _ in categories)',
    before: 1,
    after: 5,
    note: 'f-strings só com placeholders "?" e nomes de colunas fixos; valores vão em params',
  },
  {
    id: 'D2',
    file: 'expenses/export.py',
    anchor: 'subprocess.run([opener, str(path)], check=True)',
    before: 7,
    after: 1,
    note: 'lista de argumentos sem shell, caminho absoluto resolvido',
  },
  {
    id: 'D3',
    file: 'expenses/web.py',
    anchor: 'hashlib.md5(body, usedforsecurity=False)',
    before: 2,
    after: 3,
    note: 'MD5 só para ETag, marcado usedforsecurity=False',
  },
  {
    id: 'D4',
    file: 'expenses/importer.py',
    anchor: 'raise ImportRowError(line_no, str(e)) from e',
    before: 4,
    after: 2,
    note: 'tratamento de erro correto: exceção de domínio com número de linha e causa encadeada',
  },
];

runAuditCheck({ planted, decoys, minRecall: 0.75, maxDecoyHits: 1, maxReported: 15 });
