"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReport = renderReport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function renderReport(results, outFile) {
    const summary = results?.summary ?? {};
    const features = results?.features ?? [];
    const rows = features.map((f) => `
    <tr>
      <td>${f.id ?? ""}</td>
      <td>${f.status ?? ""}</td>
      <td>${f.risk ?? 0}</td>
      <td>${(f.files || []).map((x) => x.path + ":" + (x.loc ?? "")).join("<br/>")}</td>
    </tr>
  `).join("");
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
