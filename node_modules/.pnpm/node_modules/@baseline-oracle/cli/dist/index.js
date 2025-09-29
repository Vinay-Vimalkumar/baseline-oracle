#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const picocolors_1 = __importDefault(require("picocolors"));
const zod_1 = require("zod");
const engine_1 = require("@baseline-oracle/engine");
const report_1 = require("@baseline-oracle/report");
const Config = zod_1.z.object({
    target: zod_1.z.enum(["widely", "newly"]).default("widely"),
    policy: zod_1.z.object({
        failAboveRisk: zod_1.z.number().default(70),
        blockNotBaseline: zod_1.z.boolean().default(true),
    }).default({ failAboveRisk: 70, blockNotBaseline: true }),
    include: zod_1.z
        .array(zod_1.z.string())
        .default(["src/**/*.{css,scss,js,jsx,ts,tsx}", "demo.css"]),
    ignore: zod_1.z.array(zod_1.z.string()).default(["**/node_modules/**"]),
});
function loadConfig() {
    const p = path_1.default.resolve("baseline.config.json");
    if (fs_1.default.existsSync(p)) {
        return Config.parse(JSON.parse(fs_1.default.readFileSync(p, "utf8")));
    }
    return Config.parse({});
}
function usage() {
    console.log(`
${picocolors_1.default.bold("baseline")} <command> [options]

Commands:
  scan [paths...]           Scan files/dirs (uses baseline.config.json if present)
    --out <file>            Output JSON (default: .baseline/scan.json)

  report <scan.json>        Render HTML report
    --html <file>           Output HTML (default: .baseline/report.html)

  policy <scan.json>        Exit non-zero if policy violated
  annotate <scan.json>      Print GitHub annotations + exit non-zero if violations
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
    const cfg = loadConfig();
    if (!cmd) {
        usage();
        process.exit(0);
    }
    // --- scan ---
    if (cmd === "scan") {
        const inputs = args._.length ? args._ : cfg.include;
        const out = args.out || ".baseline/scan.json";
        const result = await (0, engine_1.analyzePath)(inputs, {
            target: cfg.target,
            ignore: cfg.ignore,
        });
        fs_1.default.mkdirSync(path_1.default.dirname(out), { recursive: true });
        fs_1.default.writeFileSync(out, JSON.stringify(result, null, 2), "utf8");
        console.log(picocolors_1.default.green("📝 wrote"), out);
        process.exit(0);
    }
    // --- report ---
    if (cmd === "report") {
        const scanFile = args._[0] || ".baseline/scan.json";
        const html = args.html || ".baseline/report.html";
        if (!fs_1.default.existsSync(scanFile)) {
            console.error(picocolors_1.default.red("❌ scan file not found:"), scanFile);
            process.exit(1);
        }
        const data = JSON.parse(fs_1.default.readFileSync(scanFile, "utf8"));
        (0, report_1.renderReport)(data, html);
        console.log(picocolors_1.default.green("📄 report:"), html);
        process.exit(0);
    }
    // --- policy ---
    if (cmd === "policy") {
        const scanFile = args._[0] || ".baseline/scan.json";
        if (!fs_1.default.existsSync(scanFile)) {
            console.error(picocolors_1.default.red("❌ scan file not found:"), scanFile);
            process.exit(1);
        }
        const data = JSON.parse(fs_1.default.readFileSync(scanFile, "utf8"));
        const risk = data?.summary?.riskScore ?? 0;
        const failAbove = cfg.policy.failAboveRisk ?? 70;
        const blockNB = cfg.policy.blockNotBaseline ?? true;
        let violations = 0;
        if (risk > failAbove) {
            console.error(picocolors_1.default.red(`⛔ Risk ${risk} > threshold ${failAbove} — failing.`));
            violations++;
        }
        if (blockNB && data.features.some((f) => f.status === "not-baseline")) {
            console.error(picocolors_1.default.red(`⛔ Found not-baseline features — failing.`));
            violations++;
        }
        if (violations > 0)
            process.exit(2);
        console.log(picocolors_1.default.green("✅ Policy ok"));
        process.exit(0);
    }
    // --- annotate ---
    if (cmd === "annotate") {
        const scanFile = args._[0] || ".baseline/scan.json";
        if (!fs_1.default.existsSync(scanFile)) {
            console.error(picocolors_1.default.red("❌ scan file not found:"), scanFile);
            process.exit(1);
        }
        const data = JSON.parse(fs_1.default.readFileSync(scanFile, "utf8"));
        const features = data.features || [];
        let violations = 0;
        for (const f of features) {
            const risk = f.risk ?? 0;
            const files = f.files || [];
            const failAbove = cfg.policy.failAboveRisk ?? 70;
            const blockNB = cfg.policy.blockNotBaseline ?? true;
            if ((failAbove && risk > failAbove) || (blockNB && f.status === "not-baseline")) {
                violations++;
                for (const file of files) {
                    const msg = `Feature ${f.id} has status=${f.status}, risk=${risk}`;
                    // GitHub annotation format
                    console.log(`::error file=${file.path},line=${file.loc || 1}::${msg}`);
                }
            }
        }
        if (violations > 0) {
            console.error(picocolors_1.default.red(`❌ ${violations} violations found.`));
            process.exit(2);
        }
        else {
            console.log(picocolors_1.default.green("✅ No policy violations."));
            process.exit(0);
        }
    }
    usage();
    process.exit(0);
})();
