import fs from "fs";

export async function annotate(scanPath: string, opts: { failAboveRisk?: number, blockNotBaseline?: boolean }) {
  const scan = JSON.parse(fs.readFileSync(scanPath, "utf8"));
  const features = scan.features || [];

  let violations = 0;
  for (const f of features) {
    const risk = f.risk ?? 0;
    const files = f.files || [];

    if ((opts.failAboveRisk && risk > opts.failAboveRisk) ||
        (opts.blockNotBaseline && f.status === "not-baseline")) {
      violations++;
      for (const file of files) {
        const msg = `Feature ${f.id} has status=${f.status}, risk=${risk}`;
        // GitHub annotation format
        console.log(`::error file=${file.path},line=${file.loc || 1}::${msg}`);
      }
    }
  }

  if (violations > 0) {
    console.error(`❌ ${violations} violations found.`);
    process.exit(1);
  } else {
    console.log("✅ No policy violations.");
  }
}
