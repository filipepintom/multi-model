// Check escondido da auditoria: copiado para o workspace só depois do agente terminar.
const { runAuditCheck } = require(require('path').join(process.env.EVAL_LIB, 'audit-check.js'));

const planted = [
  {
    id: 'P1',
    file: 'src/routes/exports.js',
    anchor: 'await execAsync(`tar -czf',
    before: 8,
    after: 6,
    keywords: /inje|shell|comando|command|exec|RCE|arbitr|sanitiz|escap/i,
    note: 'nome do export vindo do corpo do pedido interpolado num comando tar executado por exec (shell)',
  },
  {
    id: 'P2',
    file: 'src/routes/files.js',
    anchor: 'path.join(UPLOADS_DIR, name)',
    before: 9,
    after: 10,
    keywords: /travers|path|caminho|\.\.\/|diret|director|contain|confin|fora d|outside|arbitr|LFI|file inclusion|normali|qualquer ficheiro|any file|read any/i,
    note: 'GET /files?name=../../… lê qualquer ficheiro legível pelo processo',
  },
  {
    id: 'P3',
    file: 'src/routes/orders.js',
    anchor: "router.get('/orders/:id'",
    before: 1,
    after: 4,
    keywords: /IDOR|autoriza|authoriz|owner|dono|propriet|pertenc|belong|outr[oa]s? (utilizador|cliente|user)|other (user|customer)|another (user|customer)|alheia|controlo de acesso|access control|enumer|BOLA|object.level|any order|qualquer encomenda|view any|outr[oa]s clientes/i,
    note: 'autentica mas não verifica que a encomenda é do utilizador; ids sequenciais',
  },
  {
    id: 'P4',
    file: 'src/services/wallet.js',
    anchor: 'const balance = wallet.balance;',
    before: 3,
    after: 8,
    keywords: /corrida|race|concorr|concurr|simult|paralel|parallel|double|duplo|dupla|atomic|atómic|TOCTOU|lock|mutex|interleav|intercal|lost update|perdid|await/i,
    note: 'lê o saldo, espera pela avaliação de risco e escreve saldo antigo − valor: dois pagamentos em paralelo gastam o mesmo saldo',
  },
  {
    id: 'P5',
    file: 'src/routes/payments.js',
    anchor: "log.warn('card capture failed'",
    before: 10,
    after: 10,
    keywords: /engol|swallow|ignor|silenc|catch|captur|recus|declin|falh|fail|mascar|mask|exce/i,
    note: 'falha da captura do cartão só é registada em log e a encomenda é marcada como paga na mesma',
  },
  {
    id: 'P6',
    file: 'src/services/checkout.js',
    anchor: 'const tax = net * VAT_RATE;',
    before: 5,
    after: 2,
    keywords: /float|flutuante|vírgula|virgula|arredond|round|cêntimo|centimo|cents?\b|precis|decimal|IEEE|toFixed|inteiro|integer/i,
    note: 'totais da encomenda em float sem arredondar ao cêntimo (ex.: 3×29,99 → total 110,6631)',
  },
  {
    id: 'P7',
    file: 'src/services/checkout.js',
    anchor: 'function applyCoupon(subtotal, code)',
    before: 1,
    after: 6,
    keywords: /duplic|diverg|inconsist|incoerent|diferen|differ|mismatch|limite|limit|cap\b|capped|teto|tecto|máxim|maxim|metade|half|50 ?%|pricing|preview|pré-?visualiza|cópia|copy|cobrad|charged|mostrad|shown|display|carrinho|cart/i,
    note: 'desconto duplicado de services/pricing.js sem o limite de 50%: o preço mostrado no carrinho difere do cobrado',
  },
  {
    id: 'P8',
    file: 'src/middleware/body.js',
    anchor: "req.on('data'",
    before: 8,
    after: 4,
    keywords: /limit|tamanho|size|memór|memori|memory|DoS|nega[çc][ãa]o de servi|exaust|exhaust|unbounded|ilimitad|sem limite|grande|large|payload|max/i,
    note: 'corpo do pedido acumulado sem limite de tamanho',
  },
];

const decoys = [
  {
    id: 'D1',
    file: 'src/server.js',
    anchor: "exec('git rev-parse --short HEAD'",
    before: 4,
    after: 4,
    note: 'exec com comando constante, sem input do utilizador',
  },
  {
    id: 'D2',
    file: 'src/static.js',
    anchor: 'startsWith(PUBLIC_DIR + path.sep)',
    before: 4,
    after: 4,
    note: 'path.resolve + verificação de contenção correta',
  },
  {
    id: 'D3',
    file: 'src/router.js',
    anchor: "log.error('request failed'",
    before: 9,
    after: 3,
    note: 'catch que regista com contexto e devolve 500',
  },
  {
    id: 'D4',
    file: 'src/auth.js',
    anchor: 'crypto.timingSafeEqual(actual, expected)',
    before: 4,
    after: 6,
    note: 'scrypt + timingSafeEqual com verificação de tamanho; tokens com randomBytes(32)',
  },
];

runAuditCheck({ planted, decoys, minRecall: 0.75, maxDecoyHits: 1, maxReported: 15 });
