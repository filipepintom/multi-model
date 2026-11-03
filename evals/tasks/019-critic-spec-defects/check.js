// Check escondido: o crítico tem de apanhar os defeitos plantados na spec sem se queixar das decisões justificadas.
// Lê texto livre, para valer com qualquer formato de resposta: um defeito conta se todas as expressões baterem no
// mesmo bloco (parágrafo ou item de lista). A métrica principal é o recall; compara-se entre --label, não só o passou.
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

const MIN_FOUND = 5; // de 7, fixado antes da primeira execução
const MAX_DECOY_HITS = 1;

const PLANTED = [
  { id: 'P1-contradicao-garantia', all: [/exactly[- ]once/i, /at[- ]least[- ]once|retr(y|ies)|duplicate|repeat|idempot/i] },
  { id: 'P2-ac-nao-testavel', all: [/\bAC5\b|\bfast\b|normal load/i, /test(able|ed)|measur|threshold|vague|subjective|\bdefine|no number|latency target/i] },
  { id: 'P3-termo-indefinido', all: [/quiet tier/i, /undefined|not defined|never (defined|explained)|no definition|unspecified|unexplained|unclear|ambiguous|what .*(is|means)|nowhere else/i] },
  { id: 'P4-afirmacao-falsa-sobre-codigo', all: [/updateStatus|status_changed|refunds?\.js/i, /does(n't| not)|never|no such|not exist|nothing|missing|bypass|false|incorrect|wrong|not emit/i] },
  { id: 'P5-retries-em-memoria', all: [/in[- ]memory|setInterval/i, /restart|deploy|crash|\blost?\b|\blose|durab|persist/i] },
  { id: 'P6-ordem-vs-retries', all: [/out[- ]of[- ]order|ordering|in[- ]order(?! to)|sequenc|overtak/i, /retr|parallel|concurrent|back(s )?off|delay/i] },
  { id: 'P7-portal-fora-do-mvp', all: [/portal|analytics/i, /\bcut|defer|remove|out of scope|later|\bmvp\b|too much|first cut|not needed|yagni|drop/i] },
];

// Queixas erradas: a spec justifica estas decisões com números e o script existe no fixture.
const DECOYS = [
  { id: 'D1-rate-limit', all: [/rate[- ]limit|throttl|token bucket/i, /\bmissing\b|\bneed|should|\badd\b|without|lacks?\b/i] },
  { id: 'D2-rotacao-manual', all: [/rotat/i, /automat|self-service/i, /\bneed|should|must|\badd\b|instead/i] },
];

assert.ok(fs.existsSync('.eval-output.txt'), 'não existe .eval-output.txt (resposta do crítico)');
const text = fs.readFileSync('.eval-output.txt', 'utf8');
assert.ok(text.trim(), 'a resposta está vazia');

const blocks = text.split(/\n\s*\n|\n(?=\s*(?:[-*]|\d+\.|#|\|))/);
const hit = (item) => blocks.some((b) => item.all.every((re) => re.test(b)));

const found = PLANTED.filter(hit).map((p) => p.id);
const missed = PLANTED.filter((p) => !hit(p)).map((p) => p.id);
const decoyHits = DECOYS.filter(hit).map((d) => d.id);

const touched = execSync('git status --porcelain --untracked-files=all', { stdio: 'pipe' }).toString()
  .split('\n').map((l) => l.slice(3).trim()).filter((p) => p && !p.startsWith('.eval-'));

console.log(`encontrados: ${found.join(', ') || '—'}`);
console.log(`em falta:    ${missed.join(', ') || '—'}`);
console.log(`decoys:      ${decoyHits.join(', ') || '—'}`);
console.log(`METRICS ${JSON.stringify({ recall: `${found.length}/${PLANTED.length}`, decoy_hits: decoyHits.length, missed, decoys: decoyHits })}`);

assert.deepStrictEqual(touched, [], `o crítico alterou ficheiros: ${touched.join(', ')}`);
assert.ok(found.length >= MIN_FOUND, `recall ${found.length}/${PLANTED.length} abaixo de ${MIN_FOUND}`);
assert.ok(decoyHits.length <= MAX_DECOY_HITS, `${decoyHits.length} falsos positivos em decoys (máximo ${MAX_DECOY_HITS})`);
console.log('ok');
