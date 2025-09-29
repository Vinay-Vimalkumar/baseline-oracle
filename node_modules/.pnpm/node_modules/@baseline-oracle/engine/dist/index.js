"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePath = analyzePath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const postcss_1 = __importDefault(require("postcss"));
const postcss_selector_parser_1 = __importDefault(require("postcss-selector-parser"));
const acorn = __importStar(require("acorn"));
/**
 * Load Baseline statuses from web-features if available
 */
let baselineStatuses = {};
try {
    baselineStatuses = require("web-features/data/baseline-status.json");
}
catch {
    // fallback to empty map
}
/**
 * Map our detector IDs -> canonical web-features IDs
 */
const WEB_FEATURE_ID = {
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
function baselineStatusFor(internalId, fallback) {
    const webId = WEB_FEATURE_ID[internalId] ?? internalId;
    const s = baselineStatuses[webId]?.baseline?.status;
    if (s === "widely" || s === "newly" || s === "not-baseline")
        return s;
    return fallback;
}
/**
 * Risk scoring
 */
function score(status, hasEasyFallback) {
    const base = status === "not-baseline" ? 1 : status === "newly" ? 0.6 : 0.2;
    const severity = hasEasyFallback ? 0.5 : 1.0;
    return Math.round(base * severity * 100);
}
/**
 * CSS analysis
 */
async function analyzeCss(filePath) {
    const css = fs_1.default.readFileSync(filePath, "utf8");
    const root = postcss_1.default.parse(css);
    let hasHas = false;
    let hasContainer = false;
    let hasModernColor = false;
    let hasFocusVisible = false;
    let hasAtLayer = false;
    let hasColorMix = false;
    root.walkAtRules((at) => {
        if (at.name === "container")
            hasContainer = true;
        if (at.name === "layer")
            hasAtLayer = true;
    });
    root.walkDecls((d) => {
        if (/\blch\(|\blab\(/i.test(d.value))
            hasModernColor = true;
        if (/\bcolor-mix\(/i.test(d.value))
            hasColorMix = true;
    });
    root.walkRules((rule) => {
        (0, postcss_selector_parser_1.default)((selRoot) => {
            selRoot.walkPseudos((p) => {
                if (p.value === ":has")
                    hasHas = true;
                if (p.value === ":focus-visible")
                    hasFocusVisible = true;
            });
        }).processSync(rule.selector);
    });
    const findings = [];
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
async function analyzeJs(filePath) {
    const src = fs_1.default.readFileSync(filePath, "utf8");
    acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
    const findings = [];
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
async function analyzePath(inputPaths, opts = { target: "widely" }) {
    const patterns = inputPaths.length ? inputPaths : ["demo.css"];
    const files = await (0, fast_glob_1.default)(patterns, {
        ignore: opts.ignore ?? ["**/node_modules/**"],
        dot: false,
    });
    const all = [];
    for (const f of files) {
        const ext = path_1.default.extname(f).toLowerCase();
        if ([".css", ".scss"].includes(ext)) {
            all.push(...(await analyzeCss(f)));
        }
        else if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
            all.push(...(await analyzeJs(f)));
        }
    }
    // merge by id
    const byId = new Map();
    for (const item of all) {
        const prev = byId.get(item.id);
        if (prev) {
            prev.files.push(...item.files);
            prev.risk = Math.max(prev.risk, item.risk);
            const order = { "not-baseline": 3, "newly": 2, "widely": 1 };
            if (order[item.status] > order[prev.status])
                prev.status = item.status;
        }
        else {
            byId.set(item.id, { ...item, files: [...item.files] });
        }
    }
    const features = [...byId.values()];
    const worst = features.reduce((m, f) => Math.max(m, f.risk), 0);
    return { summary: { target: opts.target, riskScore: worst }, features };
}
