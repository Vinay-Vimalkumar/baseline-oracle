"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReport = renderReport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function docLink(id) {
    // MDN Baseline docs hosted here:
    return `https://web-platform-dx.github.io/web-features/features/${id}.html`;
}
function statusPill(status) {
    let color = "#ccc";
    if (status === "not-baseline")
        color = "#fee2e2"; // red background
    if (status === "newly")
        color = "#fef9c3"; // yellow background
    if (status === "widely")
        color = "#dcfce7"; // green background
    return `<span style="
    display:inline-block;
    padding:2px 8px;
    border-radius:999px;
    background:${color};
    font-weight:500;
  ">${status}</span>`;
}
function renderReport(results, outFile) {
    const summary = results?.summary ?? {};
    const features = results?.features ?? [];
    const rows = features
        .map((f) => `
    <tr>
      <td><a href="${docLink(f.id)}" target="_blank">${f.id ?? ""}</a></td>
      <td>${statusPill(f.status ?? "")}</td>
      <td>${f.risk ?? 0}</td>
      <td>${(f.files || [])
        .map((x) => x.path + ":" + (x.loc ?? ""))
        .join("<br/>")}</td>
    </tr>
  `)
        .join("");
    const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Baseline Report</title>
    <style>
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:24px;}
      h1{margin:0 0 12px 0}
      .summary{margin:12px 0 20px 0}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px;font-size:14px;vertical-align:top}
      th{background:#f5f7fa;text-align:left}
      .pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff}
      code{background:#f6f8fa;padding:2px 6px;border-radius:6px}
      a{color:#0645ad;text-decoration:none;}
      a:hover{text-decoration:underline;}
    </style>
  </head>
  <body>
    <h1>Baseline Report</h1>
    <div class="summary">
      <div><b>Target:</b> <code>${summary.target ?? "widely"}</code></div>
      <div><b>Risk Score:</b> <span class="pill">${summary.riskScore ?? 0}</span></div>
    </div>
    <table>
      <thead>
        <tr><th>Feature</th><th>Status</th><th>Risk</th><th>Locations</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4"><i>No features detected.</i></td></tr>'}</tbody>
    </table>
  </body>
  </html>`;
    fs_1.default.mkdirSync(path_1.default.dirname(outFile), { recursive: true });
    fs_1.default.writeFileSync(outFile, html, "utf8");
}
