/**
 * Health Trainer — recollida de dades per a l'estudi del Treball de Recerca.
 *
 * Com s'instal·la (resum; detalls al README):
 *  1. Crea un Full de càlcul de Google amb el compte de l'institut.
 *  2. Extensions → Apps Script → enganxa aquest fitxer (Code.gs) i desa.
 *  3. Implementa → Nova implementació → Tipus: Aplicació web
 *       · Executa com a: Jo
 *       · Qui hi té accés: Qualsevol persona
 *  4. Copia l'URL que acaba en /exec i posa-la a config.js (endpoint).
 *
 * Les dades es guarden en pestanyes separades:
 *  - Participants: codi + correu + nom (dades identificatives; no les comparteixis)
 *  - Dades, Registres, Aliments, Questionari: només amb el codi del participant (per a l'anàlisi)
 *  - _raw: còpia completa de l'estat de l'app (per recuperar-lo en un altre dispositiu)
 */

const SHEETS = {
  P: ['Participants', ['codi', 'email', 'nom', 'pin_hash', 'alta', 'consentiment', 'text_consentiment', 'actualitzat']],
  D: ['Dades', ['codi', 'actualitzat', 'sexe', 'edat', 'alcada_cm', 'complexio', 'activitat', 'objectiu', 'pes_inicial', 'data_inicial', 'pes_actual', 'pes_objectiu', 'data_objectiu', 'cintura_cm', 'imc', 'greix_pct', 'rca', 'metabolisme_basal', 'despesa_total', 'kcal_objectiu', 'proteina_g', 'esport_h_setmana', 'esport_kcal_setmana', 'esports', 'estil_dieta', 'n_registres_pes', 'n_dies_amb_aliments',
    'franja_edat', 'imc_categoria', 'imc_z_oms', 'pes_saludable_min', 'pes_saludable_max', 'metode_greix', 'metode_metabolisme', 'deficit_demanat_kcal', 'deficit_aplicat_kcal', 'valoracio_deficit', 'valoracio_objectiu', 'ritme_pct_setmana', 'nivell_activitat_trec', 'factor_trec', 'despesa_trec', 'aigua_l', 'mesures', 'consentiment_tutor']],
  R: ['Registres', ['codi', 'data', 'pes', 'cintura', 'imc', 'greix_pct', 'rca', 'energia_1a5', 'gana_1a5', 'son_1a5', 'observacions']],
  A: ['Aliments', ['codi', 'data', 'apat', 'aliment', 'grams', 'kcal', 'proteines_g', 'hidrats_g', 'greixos_g', 'fibra_g', 'sodi_mg']],
  Q: ['Questionari', ['codi', 'actualitzat', 'objectiu', 'alimentacio', 'condicions', 'ritme', 'dieta_recomanada', 'dieta_aplicada']],
  V: ['Valoracio', ['codi', 'actualitzat', 'data', 'sus1', 'sus2', 'sus3', 'sus4', 'sus5', 'sus6', 'sus7', 'sus8', 'sus9', 'sus10', 'sus_puntuacio_0_100', 'entenc_millor_1a5', 'he_canviat_habits_1a5', 'la_recomanaria_1a5', 'comentari']],
  X: ['_raw', ['codi', 'actualitzat', 'parts'].concat(Array.from({ length: 20 }, (_, i) => 'json' + (i + 1)))],
};
const CHUNK = 45000;          // caràcters per cel·la (límit de Google: 50.000)
const MAX_FAILS = 8;          // intents de PIN fallits per correu i hora

function doGet() {
  return out({ ok: true, app: 'Health Trainer', msg: 'Servei actiu' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const req = JSON.parse(e.postData.contents);
    const email = String(req.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return out({ ok: false, error: 'email' });
    setup();
    switch (req.action) {
      case 'sync': return out(sync(req, email));
      case 'load': return out(load(req, email));
      case 'delete': return out(remove(req, email));
      default: return out({ ok: false, error: 'action' });
    }
  } catch (err) {
    return out({ ok: false, error: 'server', detail: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- accions ---------- */
function sync(req, email) {
  const sp = sheet('P');
  let row = findRow(sp, 2, email); // columna 2 = email
  const now = new Date();
  if (row) {
    if (req.isNew) return { ok: false, error: 'exists' }; // registre nou amb un correu ja existent: cal recuperar el compte
    const a = auth(row, req, email); if (a) return a;
  } else {
    if (!req.consentAt) return { ok: false, error: 'consent' };
    const codi = uniqueCode(req.id);
    sp.appendRow([codi, email, req.nom || '', req.pinHash, req.registeredAt || now, req.consentAt, req.consentText || '', now]);
    row = sp.getLastRow();
  }
  const codi = sp.getRange(row, 1).getValue();
  sp.getRange(row, 3).setValue(req.nom || '');
  sp.getRange(row, 8).setValue(now);
  if (req.dades) upsert(sheet('D'), codi, [codi, now].concat(req.dades));
  if (req.questionari) upsert(sheet('Q'), codi, [codi, now].concat(req.questionari));
  if (req.valoracio) upsert(sheet('V'), codi, [codi, now].concat(req.valoracio));
  if (req.registres) replaceBlock(sheet('R'), codi, req.registres.map(r => [codi].concat(r)));
  if (req.aliments) replaceBlock(sheet('A'), codi, req.aliments.map(r => [codi].concat(r)));
  if (req.state) {
    const s = String(req.state); const parts = [];
    for (let i = 0; i < s.length && parts.length < 20; i += CHUNK) parts.push(s.slice(i, i + CHUNK));
    upsert(sheet('X'), codi, [codi, now, parts.length].concat(parts));
  }
  return { ok: true, id: codi, at: now.toISOString() };
}

function load(req, email) {
  const sp = sheet('P'); const row = findRow(sp, 2, email);
  if (!row) return { ok: false, error: 'notfound' };
  const a = auth(row, req, email); if (a) return a;
  const codi = sp.getRange(row, 1).getValue();
  const sx = sheet('X'); const r = findRow(sx, 1, codi);
  if (!r) return { ok: true, id: codi, state: null };
  const n = sx.getRange(r, 3).getValue();
  const parts = n ? sx.getRange(r, 4, 1, n).getValues()[0] : [];
  return { ok: true, id: codi, state: parts.join('') };
}

function remove(req, email) {
  const sp = sheet('P'); const row = findRow(sp, 2, email);
  if (!row) return { ok: true };
  const a = auth(row, req, email); if (a) return a;
  const codi = sp.getRange(row, 1).getValue();
  ['D', 'Q', 'V', 'X'].forEach(k => { const sh = sheet(k); const r = findRow(sh, 1, codi); if (r) sh.deleteRow(r); });
  ['R', 'A'].forEach(k => replaceBlock(sheet(k), codi, []));
  sp.deleteRow(row);
  return { ok: true, deleted: codi };
}

/* ---------- utilitats ---------- */
function auth(row, req, email) {
  const cache = CacheService.getScriptCache(); const key = 'f:' + email;
  const fails = Number(cache.get(key) || 0);
  if (fails >= MAX_FAILS) return { ok: false, error: 'locked' };
  const stored = sheet('P').getRange(row, 4).getValue();
  if (stored !== req.pinHash) { cache.put(key, String(fails + 1), 3600); return { ok: false, error: 'pin' }; }
  return null;
}
function setup() {
  Object.keys(SHEETS).forEach(k => {
    const [name, head] = SHEETS[k];
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); if (k === 'X') sh.hideSheet(); return; }
    // si la capçalera no coincideix amb la d'aquesta versió (columnes noves), es reescriu
    if (k === 'X') return;
    const cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
    if (cur.join('|') !== head.join('|')) sh.getRange(1, 1, 1, head.length).setValues([head]);
  });
}
function sheet(k) { return SpreadsheetApp.getActive().getSheetByName(SHEETS[k][0]); }
function findRow(sh, col, value) {
  const last = sh.getLastRow(); if (last < 2) return 0;
  const vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).toLowerCase() === String(value).toLowerCase()) return i + 2;
  return 0;
}
function upsert(sh, codi, values) {
  const r = findRow(sh, 1, codi);
  if (r) { sh.getRange(r, 1, 1, sh.getLastColumn()).clearContent(); sh.getRange(r, 1, 1, values.length).setValues([values]); }
  else sh.appendRow(values);
}
// Les files de cada participant queden sempre juntes (bloc contigu): s'esborra el bloc i s'afegeix el nou al final.
function replaceBlock(sh, codi, rows) {
  const last = sh.getLastRow();
  if (last >= 2) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues();
    let first = -1, count = 0;
    for (let i = 0; i < ids.length; i++) if (ids[i][0] === codi) { if (first < 0) first = i; count++; }
    if (count) sh.deleteRows(first + 2, count);
  }
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
function uniqueCode(wanted) {
  const sp = sheet('P');
  let c = /^HT-[A-Z0-9]{6}$/.test(wanted || '') ? wanted : null;
  while (!c || findRow(sp, 1, c)) c = 'HT-' + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
  return c;
}
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
