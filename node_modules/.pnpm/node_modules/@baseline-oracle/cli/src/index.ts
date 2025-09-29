#!/usr/bin/env node
import fs from "fs";
import path from "path";
import pc from "picocolors";
import { z } from "zod";
import { analyzePath } from "@baseline-oracle/engine";
import { renderReport } from "@baseline-oracle/report";

const Config = z.object({
  target: z.enum(["widely","newly"]).default("widely"),
  policy: z.object({
    failAboveRisk: z.number().default(70),
    blockNotBaseline: z.boolean().default(true)
  }).default({ failAboveRisk: 70, blockNotBaseline: true }),
  include: z.array(z.string()).default(["src/**/*.{css,scss,js,jsx,ts,tsx}", "demo.css"]),
  ignore: z.array(z.string()).default(["**/node_modules/**"])
});
type Config = z.infer<typeof Config>;

function loadConfig(): Config {
  const p = path.resolve("baseline.config.json");
  if (fs.existsSync(p)) {
    return Config.parse(JSON.parse(fs.readFileSync(p, "utf8")));
  }
  return Config.parse({});
}

function usage() {
  console.log(`
${pc.bold("baseline")} <command> [options]

Commands:
  scan [paths...]           Scan files/dirs (uses baseline.config.json if present)
    --out <file>            Output JSON (default: .baseline/scan.json)

  report <scan.json>        Render HTML report
    --html <file>           Output HTML (default: .baseline/report.html)

  policy <scan.json>        Exit non-zero if policy violated
`);
}

function parseArgs(argv: string[]) {
  const args: any = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = val;
    } else {
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

  if (cmd === "scan") {
    const inputs = args._.length ? args._ : cfg.include;
    const out = args.out || ".baseline/scan.json";
    const result = await analyzePath(inputs, { target: cfg.target, ignore: cfg.ignore });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result, null, 2), "utf8");
    console.log(pc.green("📝 wrote"), out);
    process.exit(0);
  }

  if (cmd === "report") {
    const scanFile = args._[0] || ".baseline/scan.json";
    const html = args.html || ".baseline/report.html";
    if (!fs.existsSync(scanFile)) {
      console.error(pc.red("❌ scan file not found:"), scanFile);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(scanFile, "utf8"));
    renderReport(data, html);
    console.log(pc.green("📄 report:"), html);
    process.exit(0);
  }

  if (cmd === "policy") {
    const scanFile = args._[0] || ".baseline/scan.json";
    if (!fs.existsSync(scanFile)) {
      console.error(pc.red("❌ scan file not found:"), scanFile);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(scanFile, "utf8"));
    const risk = data?.summary?.riskScore ?? 0;
    const failAbove = cfg.policy.failAboveRisk ?? 70;
    if (risk > failAbove) {
      console.error(pc.red(`⛔ Risk ${risk} > threshold ${failAbove} — failing.`));
      process.exit(2);
    }
    console.log(pc.green("✅ Policy ok"));
    process.exit(0);
  }

  usage();
  process.exit(0);
})();
