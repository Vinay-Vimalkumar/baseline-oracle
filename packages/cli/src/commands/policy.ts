import fs from "fs";

export async function policy(scanPath: string, opts: { failAboveRisk?: number, blockNotBaseline?: boolean }) {
  const scan = JSON.parse(fs.readFileSync(scanPath, "utf8"));
  const features = scan.features || [];

  let violations = 0;
  for (const f of features) {
    if ((opts.failAboveRisk && f.risk > opts.failAboveRisk) ||
        (opts.blockNotBaseline && f.status === "not-baseline")) {
      violations++;
    }
  }

  if (violations > 0) {
    console.error(`❌ Policy failed: ${violations} violations.`);
    process.exit(1);
  } else {
    console.log("✅ Policy passed.");
  }
}
