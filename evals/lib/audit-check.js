// Biblioteca partilhada pelos checks das evals de auditoria (/studio:audit).
//
// Mede o que importa numa auditoria:
//   recall    — quantos dos problemas plantados no fixture foram reportados (e não refutados);
//   decoys    — quantas armadilhas (código que parece suspeito mas está correto) foram reportadas: falsos positivos certos;
//   outros    — findings que não batem com nada conhecido (podem ser legítimos; reportados para análise, não penalizados).
// E garante que a auditoria não tocou no código: só pode escrever em docs/, .studio/, .claude/ e .gitignore.
//
// Uso num check.js:
//   const { runAuditCheck } = require(require('path').join(process.env.EVAL_LIB, 'audit-check.js'));
//   runAuditCheck({ planted: [...], decoys: [...], minRecall: 0.75, maxDecoyHits: 1, maxReported: 15, rebuild: 'no' });
//
// Opção rebuild (string; sem ela não se verifica): o veredicto de reconstrução que a auditoria escreve no frontmatter
// de docs/studio/<slug>/state.md (mesma pasta do findings.json). Tem de ser candidate|no|not-eligible (pending = a
// auditoria nunca o escreveu = falha) e igual ao valor pedido. rebuild, rebuild_signals, product e design vão sempre
// para as METRICS (null se faltarem).
//
// Cada item plantado ou decoy:
//   { id, file, anchor, after?, before?, keywords?, note? }
//   - anchor: texto que aparece numa única linha do ficheiro (no fixture); define o início da zona.
//   - after/before: linhas da zona depois/antes da âncora (por omissão 6 e 3).
//   - keywords: RegExp testada contra título + cenário + evidência + impacto; evita contar como encontrado
//     um finding que aponta para a linha certa mas descreve outro problema.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const VERDICTS = ['confirmed', 'plausible', 'refuted'];
const REBUILD_VALUES = ['candidate', 'no', 'not-eligible'];
const ALLOWED_WRITES = [/^docs\//, /^\.studio\//, /^\.claude\//, /^\.gitignore$/, /^\.eval-/];

function fail(msg) {
  console.error(`FALHOU: ${msg}`);
  process.exit(1);
}

function normPath(p, ws) {
  let s = String(p || '').replace(/\\/g, '/').trim();
  const wsNorm = ws.replace(/\\/g, '/');
  if (s.toLowerCase().startsWith(wsNorm.toLowerCase())) s = s.slice(wsNorm.length);
  return s.replace(/^\.?\//, '').replace(/:\d+(-\d+)?$/, '').toLowerCase();
}

function lineFrom(p) {
  const m = /:(\d+)(?:-(\d+))?$/.exec(String(p || ''));
  return m ? [Number(m[1]), Number(m[2] || m[1])] : null;
}

function findFindingsFile(ws) {
  const base = path.join(ws, 'docs', 'studio');
  if (!fs.existsSync(base)) fail('não existe docs/studio/');
  const hits = fs.readdirSync(base)
    .map((d) => path.join(base, d, 'findings.json'))
    .filter((f) => fs.existsSync(f));
  if (hits.length === 0) fail('não existe docs/studio/<slug>/findings.json');
  if (hits.length > 1) fail(`há mais do que um findings.json: ${hits.join(', ')}`);
  return hits[0];
}

// Lê só o primeiro bloco --- de <dir>/state.md. Valor = primeiro token em minúsculas (rebuild_signals: a linha toda).
function readAuditState(dir) {
  const out = { rebuild: null, rebuild_signals: null, product: null, design: null };
  let text;
  try {
    text = fs.readFileSync(path.join(dir, 'state.md'), 'utf8');
  } catch {
    return out;
  }
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^(rebuild_signals|rebuild|product|design):[ \t]*(.*)$/.exec(line);
    if (!kv || out[kv[1]] !== null) continue;
    const value = kv[2].trim();
    out[kv[1]] = kv[1] === 'rebuild_signals' ? value || null : value.split(/\s+/)[0]?.toLowerCase() || null;
  }
  return out;
}

function loadFindings(ws) {
  const file = findFindingsFile(ws);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`findings.json não é JSON válido: ${e.message}`);
  }
  const list = Array.isArray(data) ? data : data.findings;
  if (!Array.isArray(list)) fail('findings.json tem de ser uma lista ou { "findings": [...] }');
  list.forEach((f, i) => {
    const where = `finding ${f.id || i}`;
    for (const k of ['id', 'lens', 'title', 'severity', 'verdict', 'file', 'scenario']) {
      if (f[k] === undefined || f[k] === null || String(f[k]).trim() === '') fail(`${where}: falta o campo "${k}"`);
    }
    if (!SEVERITIES.includes(f.severity)) fail(`${where}: severity inválida "${f.severity}"`);
    if (!VERDICTS.includes(f.verdict)) fail(`${where}: verdict inválido "${f.verdict}"`);
    const fromPath = lineFrom(f.file);
    if (!Number.isInteger(f.line) && !fromPath) fail(`${where}: falta "line" (inteiro)`);
  });
  return list;
}

function zone(ws, item) {
  const file = path.join(ws, item.file);
  if (!fs.existsSync(file)) fail(`[config do check] ficheiro do fixture não existe: ${item.file}`);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const idx = lines.map((l, i) => (l.includes(item.anchor) ? i + 1 : 0)).filter(Boolean);
  if (idx.length !== 1) fail(`[config do check] âncora de ${item.id} aparece ${idx.length} vezes em ${item.file}`);
  return { file: normPath(item.file, ws), from: idx[0] - (item.before ?? 3), to: idx[0] + (item.after ?? 6) };
}

function locations(f, ws) {
  const out = [];
  const add = (file, line, end) => {
    const fromPath = lineFrom(file);
    const start = Number.isInteger(line) ? line : fromPath?.[0];
    const stop = Number.isInteger(end) ? end : fromPath?.[1] ?? start;
    if (start) out.push({ file: normPath(file, ws), from: start, to: Math.max(start, stop) });
  };
  add(f.file, f.line, f.end_line);
  for (const r of f.related || []) add(r.file, r.line, r.end_line);
  return out;
}

function matches(f, z, item, ws) {
  const text = [f.title, f.scenario, f.evidence, f.impact, f.fix].filter(Boolean).join(' ');
  if (item.keywords && !item.keywords.test(text)) return false;
  return locations(f, ws).some((l) => l.file === z.file && l.from <= z.to && l.to >= z.from);
}

function sourceChanges(ws) {
  const sh = (c) => execSync(c, { cwd: ws, stdio: 'pipe' }).toString();
  const root = sh('git rev-list --max-parents=0 HEAD').trim().split('\n')[0];
  const changed = new Set([
    ...sh(`git diff --name-only ${root} HEAD`).split('\n'),
    ...sh('git status --porcelain --untracked-files=all').split('\n').map((l) => l.slice(3).replace(/^"|"$/g, '')),
  ].map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean));
  return [...changed].filter((p) => !ALLOWED_WRITES.some((re) => re.test(p)));
}

function runAuditCheck({ planted, decoys = [], minRecall = 0.75, maxDecoyHits = 1, maxReported = 15, rebuild }) {
  const ws = process.cwd();

  const touched = sourceChanges(ws);
  if (touched.length) fail(`a auditoria alterou código (só pode escrever em docs/ e .studio/): ${touched.join(', ')}`);

  const findings = loadFindings(ws);
  const reported = findings.filter((f) => f.verdict !== 'refuted');
  const plantedZones = planted.map((p) => ({ item: p, z: zone(ws, p) }));
  const decoyZones = decoys.map((d) => ({ item: d, z: zone(ws, d) }));

  const found = [];
  const missed = [];
  for (const { item, z } of plantedZones) {
    const hit = reported.find((f) => matches(f, z, item, ws));
    (hit ? found : missed).push(hit ? `${item.id}←${hit.id}` : item.id);
  }

  const decoyHits = [];
  let other = 0;
  for (const f of reported) {
    const isPlanted = plantedZones.some(({ item, z }) => matches(f, z, item, ws));
    if (isPlanted) continue;
    const decoy = decoyZones.find(({ item, z }) => matches(f, z, { ...item, keywords: undefined }, ws));
    if (decoy) decoyHits.push(`${decoy.item.id}←${f.id}`);
    else other++;
  }

  const state = readAuditState(path.dirname(findFindingsFile(ws)));

  const metrics = {
    recall: `${found.length}/${planted.length}`,
    decoy_hits: decoyHits.length,
    other,
    reported: reported.length,
    confirmed: findings.filter((f) => f.verdict === 'confirmed').length,
    plausible: findings.filter((f) => f.verdict === 'plausible').length,
    refuted: findings.filter((f) => f.verdict === 'refuted').length,
    missed,
    rebuild: state.rebuild,
    rebuild_signals: state.rebuild_signals,
    product: state.product,
    design: state.design,
  };
  console.log(`encontrados: ${found.join(', ') || '—'}`);
  console.log(`em falta:    ${missed.join(', ') || '—'}`);
  console.log(`decoys:      ${decoyHits.join(', ') || '—'}`);
  console.log(`outros:      ${other}`);
  console.log(`METRICS ${JSON.stringify(metrics)}`);

  const problems = [];
  if (found.length / planted.length < minRecall) problems.push(`recall ${found.length}/${planted.length} abaixo de ${Math.round(minRecall * 100)}%`);
  if (decoyHits.length > maxDecoyHits) problems.push(`${decoyHits.length} falsos positivos em decoys (máximo ${maxDecoyHits})`);
  if (reported.length > maxReported) problems.push(`${reported.length} findings reportados (máximo ${maxReported}): uma auditoria útil prioriza`);
  if (rebuild !== undefined) {
    if (!fs.existsSync(path.join(path.dirname(findFindingsFile(ws)), 'state.md'))) problems.push('não existe docs/studio/<slug>/state.md');
    else if (!REBUILD_VALUES.includes(state.rebuild) || state.rebuild !== rebuild) {
      problems.push(`rebuild: esperado "${rebuild}", encontrado "${state.rebuild}" (sinais: ${state.rebuild_signals})`);
    }
  }
  if (problems.length) fail(problems.join('; '));
  console.log('ok');
}

module.exports = { runAuditCheck, readAuditState };
