import fs from "fs";
import path from "path";

type Finding = {
  id: string;
  status: "widely" | "newly" | "not-baseline";
  risk: number;
  files: { path: string; loc?: number }[];
};

type Result = {
  summary: { target: "widely" | "newly"; riskScore: number };
  features: Finding[];
};

function safe<T>(v: T, fallback: T): T {
  return (v as any) == null ? fallback : v;
}
function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function docsUrl(id: string) {
  // canonical web-features docs page for that feature id
  return `https://web-platform-dx.github.io/web-features/features/${encodeURIComponent(
    id
  )}.html`;
}

function tipFor(id: string): string {
  if (id.includes("has")) return "Use progressive enhancement: toggle a class in JS as a fallback.";
  if (id.includes("container")) return "Offer layout utility fallbacks for older engines.";
  if (id.includes("lch") || id.includes("lab") || id.includes("color-mix"))
    return "Emit sRGB fallback at build time (PostCSS) or provide a safe color.";
  if (id.includes("view-transition")) return "Guard with feature-detect; provide instant hide/show fallback.";
  if (id.includes("dialog")) return "Polyfill or use ARIA-compliant modal pattern.";
  if (id.includes("popover")) return "Consider an accessible custom popover as a fallback.";
  if (id.includes("focus-visible")) return "Provide focus styles gated by :focus-visible polyfill fallback.";
  if (id.includes("layer")) return "Gracefully degrade layering by ordering and specificity.";
  return "Consider progressive enhancement or a lightweight polyfill.";
}

export function renderReport(results: Result, outFile: string) {
  const summary = safe(results?.summary, { target: "widely", riskScore: 0 });
  const features = safe(results?.features, []);

  const rows = features.map((f) => ({
    id: f.id,
    idEsc: escapeHtml(f.id),
    status: f.status,
    risk: Number.isFinite(f.risk) ? f.risk : 0,
    files: (f.files || [])
      .map((x) => `${x.path}${x.loc ? `:${x.loc}` : ""}`)
      .join("\n"),
    docs: docsUrl(f.id),
    tip: tipFor(f.id),
  }));

  const counts = {
    total: rows.length,
    widely: rows.filter((r) => r.status === "widely").length,
    newly: rows.filter((r) => r.status === "newly").length,
    notb: rows.filter((r) => r.status === "not-baseline").length,
  };

  const bootstrapData = escapeHtml(JSON.stringify(rows));
  const bootstrapSummary = escapeHtml(JSON.stringify(summary));
  const bootstrapCounts = escapeHtml(JSON.stringify(counts));

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Baseline Report</title>
<style>
:root{
  --bg: #0b1020;
  --panel: #0f162b;
  --panel-2:#0c1326;
  --line:#223455;
  --text:#e6e8ee;
  --muted:#9fb0c9;
  --accent:#7aa2ff;
  --good:#3bd671;
  --warn:#f4b740;
  --bad:#ff6b6b;
  --shadow: 0 8px 24px rgba(0,0,0,.35);
}
:root.light{
  --bg:#f6f8fb;
  --panel:#ffffff;
  --panel-2:#f3f6fb;
  --line:#e5e9f2;
  --text:#0f172a;
  --muted:#6b7280;
  --accent:#3b82f6;
  --good:#16a34a;
  --warn:#d97706;
  --bad:#dc2626;
  --shadow: 0 10px 24px rgba(2, 12, 27, .08);
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0; color:var(--text);
  font:14px/1.45 system-ui, Segoe UI, Roboto, Arial, sans-serif;
  background:
    radial-gradient(1000px 600px at -10% -10%, rgba(122,162,255,.18), transparent 60%),
    radial-gradient(900px 500px at 110% -20%, rgba(59,130,246,.15), transparent 55%),
    var(--bg);
}
a{color:var(--accent); text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:1160px; margin:0 auto; padding:24px 16px}

header.hero{
  position:sticky; top:0; z-index:10;
  background: linear-gradient(to bottom, rgba(11,16,32,.75), rgba(11,16,32,.45) 40%, transparent);
  backdrop-filter: blur(6px);
  border-bottom:1px solid var(--line);
}
.hero-inner{display:flex; align-items:center; justify-content:space-between; gap:16px}
.brand{display:flex; align-items:center; gap:12px}
.brand .logo{
  width:34px;height:34px;border-radius:10px;
  display:grid; place-items:center; color:white;
  background: linear-gradient(135deg, #6ee7ff, #7aa2ff 60%, #a78bfa);
  box-shadow: var(--shadow);
}
.brand h1{margin:0; font-size:20px; letter-spacing:.2px}

.toolbar{
  margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; align-items:center
}
input[type="search"]{
  width:320px; max-width:70vw; padding:10px 12px; border-radius:10px;
  border:1px solid var(--line); background:var(--panel-2); color:var(--text); outline:none;
}
.select{
  padding:9px 12px; border-radius:10px; border:1px solid var(--line);
  background:var(--panel-2); color:var(--text)
}
.chip{display:inline-flex; gap:8px; align-items:center; padding:7px 11px; border-radius:999px;
      border:1px solid var(--line); background:var(--panel-2); user-select:none}
.chip input{accent-color:var(--accent); transform:translateY(1px)}
.btn{padding:9px 12px; border-radius:10px; border:1px solid var(--line); background:var(--panel-2); color:var(--text); cursor:pointer}
.btn:hover{border-color:var(--accent)}

.cards{display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px; margin-top:16px}
.card{
  background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px;
  box-shadow: var(--shadow);
}
.card .label{color:var(--muted); font-size:12px}
.card .value{margin-top:6px; font-size:18px; font-weight:700}

.table-wrap{
  background:var(--panel); border:1px solid var(--line); border-radius:14px; margin-top:16px;
  overflow:hidden; box-shadow: var(--shadow);
}
table{width:100%; border-collapse:separate; border-spacing:0}
th,td{padding:12px 14px; border-bottom:1px solid var(--line); vertical-align:top}
th{
  position:sticky; top:112px; background:var(--panel);
  text-align:left; font-weight:700; font-size:13px; z-index:5
}
tr:nth-child(even) td{background: color-mix(in oklab, var(--panel) 94%, black)}
tr:hover td{background: color-mix(in oklab, var(--panel) 92%, black)}
th.sortable{cursor:pointer}
th.sortable .dir{opacity:.5; font-size:12px; margin-left:6px}

.status{display:inline-flex; align-items:center; gap:8px; padding:2px 10px; border-radius:999px; font-weight:600}
.status.widely{background:rgba(59,222,130,.15); color:var(--good)}
.status.newly{background:rgba(244,183,64,.15); color:var(--warn)}
.status.not-baseline{background:rgba(255,107,107,.15); color:var(--bad)}

.risk{min-width:180px; height:18px; border-radius:8px; background:var(--panel-2); border:1px solid var(--line); position:relative; overflow:hidden}
.risk>.bar{height:100%}
.risk>.val{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:var(--text)}

.files details{max-width:520px}
.file-row{display:flex; align-items:center; gap:8px; margin:2px 0}
.copy{padding:0 8px; height:24px; border-radius:6px; border:1px solid var(--line); background:var(--panel-2); color:var(--text); cursor:pointer}
.copy:hover{border-color:var(--accent)}

.footer{color:var(--muted); margin:20px 4px 36px}

.empty{
  padding:48px 0; display:grid; place-items:center; color:var(--muted)
}
.theme{
  display:flex; gap:8px; align-items:center; color:var(--muted)
}
.theme input{accent-color:var(--accent)}
.badge{display:inline-block; padding:2px 8px; border-radius:999px; background:var(--panel-2); border:1px solid var(--line)}
</style>
</head>
<body>
<header class="hero">
  <div class="container hero-inner">
    <div class="brand">
      <div class="logo" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 5.4L20 9l-5.2 3.1L13 18l-1-5.9L6 9l5.8-.3L12 2z" fill="white" opacity=".9"/></svg>
      </div>
      <h1>Baseline Report</h1>
    </div>
    <div class="theme">
      <label><input id="themeToggle" type="checkbox"/> Light mode</label>
    </div>
  </div>
  <div class="container">
    <div class="cards">
      <div class="card"><div class="label">Target</div><div class="value" id="statTarget"></div></div>
      <div class="card"><div class="label">Risk Score</div><div class="value" id="statRisk"></div></div>
      <div class="card"><div class="label">Total Features</div><div class="value"><span id="statCount"></span></div></div>
      <div class="card"><div class="label">By Status</div>
        <div class="value">
          <span class="badge" id="countNot">not-baseline: 0</span>
          <span class="badge" id="countNew">newly: 0</span>
          <span class="badge" id="countWide">widely: 0</span>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <input id="q" type="search" placeholder="Search feature or path…"/>
      <label class="chip"><input type="checkbox" data-status="not-baseline" checked> not-baseline</label>
      <label class="chip"><input type="checkbox" data-status="newly" checked> newly</label>
      <label class="chip"><input type="checkbox" data-status="widely" checked> widely</label>
      <select id="sort" class="select">
        <option value="risk:desc">Sort: Risk (high→low)</option>
        <option value="risk:asc">Sort: Risk (low→high)</option>
        <option value="id:asc">Sort: Feature (A→Z)</option>
        <option value="status:asc">Sort: Status</option>
      </select>
      <button class="btn" id="exportJson">Export JSON</button>
      <button class="btn" id="exportCsv">Export CSV</button>
    </div>
  </div>
</header>

<main class="container">
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="sortable" data-key="id">Feature <span class="dir">↕</span></th>
          <th>Status</th>
          <th class="sortable" data-key="risk">Risk <span class="dir">↕</span></th>
          <th>Docs</th>
          <th>Quick tip</th>
          <th>Locations</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <div id="empty" class="empty" hidden>
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <rect x="8" y="10" width="104" height="70" rx="10" stroke="currentColor" opacity=".25"/>
        <rect x="20" y="28" width="80" height="10" rx="5" fill="currentColor" opacity=".15"/>
        <rect x="20" y="46" width="60" height="10" rx="5" fill="currentColor" opacity=".15"/>
      </svg>
      <div style="margin-top:10px">No features match your filters.</div>
    </div>
  </div>
  <div class="footer">Generated by Baseline Oracle</div>
</main>

<script id="data" type="application/json">${bootstrapData}</script>
<script id="summary" type="application/json">${bootstrapSummary}</script>
<script id="counts" type="application/json">${bootstrapCounts}</script>
<script>
// bootstrap
const data = JSON.parse(document.getElementById('data').textContent || '[]');
const summary = JSON.parse(document.getElementById('summary').textContent || '{}');
const counts = JSON.parse(document.getElementById('counts').textContent || '{}');

const rowsEl = document.getElementById('rows');
const emptyEl = document.getElementById('empty');
const qEl = document.getElementById('q');
const sortSel = document.getElementById('sort');
const checks = Array.from(document.querySelectorAll('.chip input'));
const statTarget = document.getElementById('statTarget');
const statRisk = document.getElementById('statRisk');
const statCount = document.getElementById('statCount');
const statShown = document.createElement('span');
statShown.className = 'badge';
document.querySelectorAll('.card .value')[2]?.appendChild(statShown);
const themeToggle = document.getElementById('themeToggle');
const countNot = document.getElementById('countNot');
const countNew = document.getElementById('countNew');
const countWide = document.getElementById('countWide');

statTarget.textContent = summary.target || 'widely';
statRisk.textContent = String(summary.riskScore ?? 0);
statCount.textContent = String(counts.total ?? data.length);
countNot.textContent = 'not-baseline: ' + String(counts.notb ?? 0);
countNew.textContent = 'newly: ' + String(counts.newly ?? 0);
countWide.textContent = 'widely: ' + String(counts.widely ?? 0);

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function riskColor(n){
  return n>=70 ? cssVar('--bad') : n>=40 ? cssVar('--warn') : cssVar('--good');
}
function statusPill(s){
  return '<span class="status '+s+'">'+s+'</span>';
}
function riskBar(n){
  const pct = Math.max(0, Math.min(100, Number(n)||0));
  const col = riskColor(pct);
  return '<div class="risk"><div class="bar" style="width:'+pct+'%; background:'+col+'"></div><div class="val">'+pct+'</div></div>';
}
function fileCell(text){
  const lines = String(text||'').split('\\n').filter(Boolean);
  if (!lines.length) return '<i>—</i>';
  const esc = (s)=> s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const mk = (s)=> '<div class="file-row"><button class="copy" data-copy="'+esc(s)+'">Copy</button><code>'+esc(s)+'</code></div>';
  if (lines.length === 1) return mk(lines[0]);
  return '<details class="files"><summary>'+esc(lines[0])+' (+'+(lines.length-1)+' more)</summary>'+lines.map(mk).join('')+'</details>';
}
function docLink(url){
  const safe = String(url||'').replace(/"/g,'&quot;');
  return '<a href="'+safe+'" target="_blank" rel="noopener">Open</a>';
}
function filters(){
  const on = new Set(checks.filter(c=>c.checked).map(c=>c.getAttribute('data-status')));
  const q = (qEl.value||'').trim().toLowerCase();
  return {on, q};
}
function sortRows(rows){
  const [key,dir] = (sortSel.value||'risk:desc').split(':');
  const arr = rows.slice();
  arr.sort((a,b)=>{
    let va=a[key], vb=b[key];
    if (key==='risk'){ va=+va||0; vb=+vb||0; }
    else { va=String(va); vb=String(vb); }
    if (va<vb) return dir==='asc' ? -1 : 1;
    if (va>vb) return dir==='asc' ? 1 : -1;
    return 0;
  });
  return arr;
}
function apply(){
  const {on,q} = filters();
  let out = data.filter(r => on.has(r.status));
  if (q) out = out.filter(r =>
    r.id.toLowerCase().includes(q) ||
    String(r.files||'').toLowerCase().includes(q)
  );
  out = sortRows(out);

  rowsEl.innerHTML = out.map(r =>
    '<tr>'+
      '<td><a href="'+r.docs.replace(/"/g,'&quot;')+'" target="_blank" rel="noopener">'+r.idEsc+'</a></td>'+
      '<td>'+statusPill(r.status)+'</td>'+
      '<td>'+riskBar(r.risk)+'</td>'+
      '<td>'+docLink(r.docs)+'</td>'+
      '<td>'+escapeHtml(r.tip)+'</td>'+
      '<td>'+fileCell(r.files)+'</td>'+
    '</tr>'
  ).join('');

  statShown.textContent = out.length + ' shown';
  emptyEl.hidden = out.length !== 0;
}
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

// events
[qEl, sortSel].forEach(el => el && el.addEventListener('input', apply));
checks.forEach(el => el.addEventListener('input', apply));
document.addEventListener('click', (e)=>{
  const t = e.target;
  if (!t) return;
  const btn = t.closest && t.closest('.copy');
  if (!btn) return;
  const text = btn.getAttribute('data-copy') || '';
  navigator.clipboard.writeText(text);
  btn.textContent = 'Copied!';
  setTimeout(()=>{ btn.textContent = 'Copy'; }, 850);
});

// export buttons
function download(name, content, type){
  const blob = new Blob([content], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function currentFilteredSorted(){
  const {on,q} = filters();
  let filtered = data.filter(r => on.has(r.status) && (!q || r.id.toLowerCase().includes(q) || String(r.files||'').toLowerCase().includes(q)));
  return sortRows(filtered);
}
const exportJsonBtn = document.getElementById('exportJson');
if (exportJsonBtn) exportJsonBtn.addEventListener('click', ()=>{
  const view = currentFilteredSorted();
  download('baseline-report.json', JSON.stringify({summary, features: view}, null, 2), 'application/json');
});
const exportCsvBtn = document.getElementById('exportCsv');
if (exportCsvBtn) exportCsvBtn.addEventListener('click', ()=>{
  const view = currentFilteredSorted();
  const esc = (s)=>'"'+String(s).replace(/"/g,'""')+'"';
  const csv = ['feature,status,risk,docs,tip,locations']
    .concat(view.map(r=>[r.idEsc,r.status,r.risk,r.docs,escapeHtml(r.tip),(r.files||'').replace(/\\n/g,' | ')].map(esc).join(',')))
    .join('\\n');
  download('baseline-report.csv', csv, 'text/csv');
});

// theme (persist)
const savedTheme = localStorage.getItem('baselineTheme');
const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
const initialLight = savedTheme ? (savedTheme === 'light') : prefersLight;
document.documentElement.classList.toggle('light', initialLight);
if (themeToggle) (themeToggle as any).checked = initialLight;
if (themeToggle) themeToggle.addEventListener('change', ()=>{
  const lt = (themeToggle as any).checked;
  document.documentElement.classList.toggle('light', lt);
  localStorage.setItem('baselineTheme', lt ? 'light' : 'dark');
});

apply();
</script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, "utf8");
}
