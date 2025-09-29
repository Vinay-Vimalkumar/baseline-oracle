#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const engine_1 = require("@baseline-oracle/engine");
const report_1 = require("@baseline-oracle/report");
function usage() {
    console.log(`
baseline <command> [options]

Commands:
  scan <input> --out <file> --target <widely|newly>
  report <scan.json> --html <file>

Examples:
  baseline scan demo.css --out .baseline/scan.json --target widely
  baseline report .baseline/scan.json --html .baseline/report.html
`);
}
function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith("--")) {
            const key = a.slice(2);
            const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
            args[key] = val;
        }
        else {
            args._.push(a);
        }
    }
    return args;
}
(async function main() {
    const [, , cmd, ...rest] = process.argv;
    const args = parseArgs(rest);
    if (!cmd || (cmd !== "scan" && cmd !== "report")) {
        console.log("✅ Baseline Oracle CLI running...");
        usage();
        process.exit(0);
    }
    if (cmd === "scan") {
        const input = args._[0] || "demo.css";
        const out = args.out || ".baseline/scan.json";
        const target = args.target || "widely";
        // very simple: if input is a file, analyze it; future: glob/dir support
        const result = (0, engine_1.analyze)(input);
        const scan = {
            summary: { target, riskScore: result.riskScore ?? 0 },
            features: [
                {
                    id: "css-selector-has",
                    status: result.riskScore > 0 ? "not-baseline" : "widely",
                    risk: result.riskScore ?? 0,
                    files: [{ path: input, loc: 1 }]
                }
            ]
        };
        fs_1.default.mkdirSync(path_1.default.dirname(out), { recursive: true });
        fs_1.default.writeFileSync(out, JSON.stringify(scan, null, 2), "utf8");
        console.log("📝 wrote", out);
        process.exit(0);
    }
    if (cmd === "report") {
        const scanFile = args._[0] || ".baseline/scan.json";
        const html = args.html || ".baseline/report.html";
        if (!fs_1.default.existsSync(scanFile)) {
            console.error("❌ scan file not found:", scanFile);
            process.exit(1);
        }
        const data = JSON.parse(fs_1.default.readFileSync(scanFile, "utf8"));
        (0, report_1.renderReport)(data, html);
        console.log("📄 report:", html);
        process.exit(0);
    }
})();
