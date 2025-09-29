import fs from "fs";
import path from "path";
import fg from "fast-glob";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import * as acorn from "acorn";

/**
 * Types
 */
type BaselineStatus = "widely" | "newly" | "not-baseline";

type Finding = {
  id: string;
  status: BaselineStatus;
  risk: number;
  files: { path: string; loc?: number }[];
};

type ScanResult = {
  summary: { target: "widely" | "newly"; riskScore: number };
  features: Finding[];
};

/**
 * Load Baseline statuses from web-features if available
 */
let baselineStatuses: Record<
  string,
  { baseline?: { status?: BaselineStatus } }
> = {};
try {
  baselineStatuses = require("web-features/data/baseline-status.json");
} catch {
  // fallback to empty map
}

/**
 * Map our detector IDs -> canonical web-features IDs
 */
const WEB_FEATURE_ID: Record<string, string> = {
  "css-selector-has": "css-selector-has",
  "css-container-queries": "css-container-queries",
  "css-color-lch-lab": "css-color-lch-lab",
  "css-focus-visible": "css-focus-visible",
  "css-at-layer": "css-at-layer",
  "css-color-mix": "css-color-mix",
  "view-transitions-api": "view-transitions-api",
  "html-dialog-element": "html-dialog-element",
  "html-popover-api": "html-popover-api",
};

/**
 * Lookup Baseline status with fallback
 */
function baselineStatusFor(
  internalId: string,
  fallback: BaselineStatus
): BaselineStatus {
  const webId = WEB_FEATURE_ID[internalId] ?? internalId;
  const s = baselineStatuses[webId]?.baseline?.status;
  if (s === "widely" || s === "newly" || s === "not-baseline") return s;
  return fallback;
}

/**
 * Risk scoring
 */
function score(status: BaselineStatus, hasEasyFallback: boolean) {
  const base = status === "not-baseline" ? 1 : status === "newly" ? 0.6 : 0.2;
  const severity = hasEasyFallback ? 0.5 : 1.0;
  return Math.round(base * severity * 100);
}

/**
 * CSS analysis
 */
async function analyzeCss(filePath: string): Promise<Finding[]> {
  const css = fs.readFileSync(filePath, "utf8");
  const root = postcss.parse(css);

  let hasHas = false;
  let hasContainer = false;
  let hasModernColor = false;
  let hasFocusVisible = false;
  let hasAtLayer = false;
  let hasColorMix = false;

  root.walkAtRules((at) => {
    if (at.name === "container") hasContainer = true;
    if (at.name === "layer") hasAtLayer = true;
  });

  root.walkDecls((d) => {
    if (/\blch\(|\blab\(/i.test(d.value)) hasModernColor = true;
    if (/\bcolor-mix\(/i.test(d.value)) hasColorMix = true;
  });

  root.walkRules((rule) => {
    selectorParser((selRoot) => {
      selRoot.walkPseudos((p) => {
        if (p.value === ":has") hasHas = true;
        if (p.value === ":focus-visible") hasFocusVisible = true;
      });
    }).processSync(rule.selector);
  });

  const findings: Finding[] = [];

  if (hasHas) {
    const status = baselineStatusFor("css-selector-has", "not-baseline");
    findings.push({
      id: "css-selector-has",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  if (hasContainer) {
    const status = baselineStatusFor("css-container-queries", "newly");
    findings.push({
      id: "css-container-queries",
      status,
      risk: score(status, false),
      files: [{ path: filePath }],
    });
  }

  if (hasModernColor) {
    const status = baselineStatusFor("css-color-lch-lab", "newly");
    findings.push({
      id: "css-color-lch-lab",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  if (hasFocusVisible) {
    const status = baselineStatusFor("css-focus-visible", "widely");
    findings.push({
      id: "css-focus-visible",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  if (hasAtLayer) {
    const status = baselineStatusFor("css-at-layer", "newly");
    findings.push({
      id: "css-at-layer",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  if (hasColorMix) {
    const status = baselineStatusFor("css-color-mix", "newly");
    findings.push({
      id: "css-color-mix",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  return findings;
}

/**
 * JS analysis
 */
async function analyzeJs(filePath: string): Promise<Finding[]> {
  const src = fs.readFileSync(filePath, "utf8");
  acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });

  const findings: Finding[] = [];

  if (/\bdocument\.startViewTransition\b/.test(src)) {
    const status = baselineStatusFor("view-transitions-api", "newly");
    findings.push({
      id: "view-transitions-api",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  if (/\bdialog\.showModal\(\)/.test(src) || /\bHTMLDialogElement\b/.test(src)) {
    const status = baselineStatusFor("html-dialog-element", "widely");
    findings.push({
      id: "html-dialog-element",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  if (/\bshowPopover\(\)|hidePopover\(\)|togglePopover\(\)/.test(src) || /\bpopover\s*=/.test(src)) {
    const status = baselineStatusFor("html-popover-api", "newly");
    findings.push({
      id: "html-popover-api",
      status,
      risk: score(status, true),
      files: [{ path: filePath }],
    });
  }

  return findings;
}

/**
 * Main entry
 */
export async function analyzePath(
  inputPaths: string[],
  opts: { target: "widely" | "newly"; ignore?: string[] } = { target: "widely" }
): Promise<ScanResult> {
  const patterns = inputPaths.length ? inputPaths : ["demo.css"];
  const files = await fg(patterns, {
    ignore: opts.ignore ?? ["**/node_modules/**"],
    dot: false,
  });

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
