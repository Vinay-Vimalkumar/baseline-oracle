// scripts/policy.js
const fs = require("fs");

const SCAN = ".baseline/scan.json";
const MAX_RISK = Number(process.env.BASELINE_MAX_RISK ?? 70);
const BLOCK_NOT_BASELINE = String(process.env.BASELINE_BLOCK_NOT_BASELINE ?? "true") === "true";

const data = JSON.parse(fs.readFileSync(SCAN, "utf8"));
const risk = data?.summary?.riskScore ?? 0;
const offenders = (data?.features ?? []).filter(f =>
  (BLOCK_NOT_BASELINE && f.status === "not-baseline") || (f.risk ?? 0) > MAX_RISK
);

console.log(`Baseline policy: risk=${risk}, max=${MAX_RISK}, blockNotBaseline=${BLOCK_NOT_BASELINE}`);
if (offenders.length) {
  console.error("Policy violations:");
  offenders.forEach(f => console.error(`- ${f.id} (status=${f.status}, risk=${f.risk})`));
  process.exit(1);
}
if (risk > MAX_RISK) {
  console.error(`Overall risk ${risk} exceeds ${MAX_RISK}`);
  process.exit(1);
}
console.log("Baseline policy OK.");
