import fs from "fs";
import path from "path";
import fg from "fast-glob";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import * as acorn from "acorn";

type Finding = {
  id: string;
  status: "widely" | "newly" | "not-baseline";
  risk: number;
  files: { path: string; loc?: number }[];
};

type ScanResult = {
  summary: { target: "widely" | "newly"; riskScore: number };
  features: Finding[];
};

function score(status: Finding["status"], hasEasyFallback: boolean) {
  const base = status === "not-baseline" ? 1 : status === "newly" ? 0.6 : 0.2;
  const severity = hasEasyFallback ? 0.5 : 1.0;
  return Math.round(base * severity * 100);
}

async function analyzeCss(filePath: string): Promise<Finding[]> {
  const css = fs.readFileSync(filePath, "utf8");
  const root = postcss.parse(css);

  let hasHas = false;
  let hasContainer = false;
  let hasModernColor = false;

  root.walkAtRules((at) => {
    if (at.name === "container") hasContainer = true;
  });

  // naive color check
  root.walkDecls((d) => {
    if (/\blch\(|\blab\(/i.test(d.value)) hasModernColor = true;
  });

  // selector check
  root.walkRules((rule) => {
    selectorParser((selRoot) => {
      selRoot.walkPseudos((p) => {
        if (p.value === ":has") hasHas = true;
      });
    }).processSync(rule.selector);
  });

  const findings: Finding[] = [];
  if (hasHas) {
    findings.push({
      id: "css-selector-has",
      status: "not-baseline", // TODO: replace with real Baseline lookup
      risk: score("not-baseline", /*easy fallback?*/ true),
      files: [{ path: filePath }]
    });
  }
  if (hasContainer) {
    findings.push({
      id: "css-container-queries",
      status: "newly",
      risk: score("newly", false),
      files: [{ path: filePath }]
    });
  }
  if (hasModernColor) {
    findings.push({
      id: "css-color-lch-lab",
      status: "newly",
      risk: score("newly", true),
      files: [{ path: filePath }]
    });
  }
  return findings;
}

async function analyzeJs(filePath: string): Promise<Finding[]> {
  const src = fs.readFileSync(filePath, "utf8");
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }) as any;
  const findings: Finding[] = [];

  // extremely light checks
  const code = src;
  if (/\bdocument\.startViewTransition\b/.test(code)) {
    findings.push({
      id: "view-transitions-api",
      status: "newly",
      risk: score("newly", true),
      files: [{ path: filePath }]
    });
  }
  if (/\bdialog\.showModal\(\)/.test(code) || /\bHTMLDialogElement\b/.test(code)) {
    findings.push({
      id: "html-dialog-element",
      status: "widely",
      risk: score("widely", true),
      files: [{ path: filePath }]
    });
  }
  return findings;
}

export async function analyzePath(
  inputPaths: string[],
  opts: { target: "widely" | "newly"; ignore?: string[] } = { target: "widely" }
): Promise<ScanResult> {
  const patterns = inputPaths.length ? inputPaths : ["demo.css"];
  const files = await fg(patterns, { ignore: opts.ignore ?? ["**/node_modules/**"], dot: false });

  const all: Finding[] = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if ([".css", ".scss"].includes(ext)) {
      all.push(...(await analyzeCss(f)));
    } else if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
      all.push(...(await analyzeJs(f)));
    }
  }

  // merge by id
  const byId = new Map<string, Finding>();
  for (const item of all) {
    const prev = byId.get(item.id);
    if (prev) {
      prev.files.push(...item.files);
      prev.risk = Math.max(prev.risk, item.risk);
      // keep worst status
      const order = { "not-baseline": 3, "newly": 2, "widely": 1 } as const;
      if (order[item.status] > order[prev.status]) prev.status = item.status;
    } else {
      byId.set(item.id, { ...item, files: [...item.files] });
    }
  }
  const features = [...byId.values()];
  const worst = features.reduce((m, f) => Math.max(m, f.risk), 0);
  return { summary: { target: opts.target, riskScore: worst }, features };
}
