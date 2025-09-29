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
function score(status, hasEasyFallback) {
    const base = status === "not-baseline" ? 1 : status === "newly" ? 0.6 : 0.2;
    const severity = hasEasyFallback ? 0.5 : 1.0;
    return Math.round(base * severity * 100);
}
async function analyzeCss(filePath) {
    const css = fs_1.default.readFileSync(filePath, "utf8");
    const root = postcss_1.default.parse(css);
    let hasHas = false;
    let hasContainer = false;
    let hasModernColor = false;
    root.walkAtRules((at) => {
        if (at.name === "container")
            hasContainer = true;
    });
    // naive color check
    root.walkDecls((d) => {
        if (/\blch\(|\blab\(/i.test(d.value))
            hasModernColor = true;
    });
    // selector check
    root.walkRules((rule) => {
        (0, postcss_selector_parser_1.default)((selRoot) => {
            selRoot.walkPseudos((p) => {
                if (p.value === ":has")
                    hasHas = true;
            });
        }).processSync(rule.selector);
    });
    const findings = [];
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
async function analyzeJs(filePath) {
    const src = fs_1.default.readFileSync(filePath, "utf8");
    const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
    const findings = [];
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
async function analyzePath(inputPaths, opts = { target: "widely" }) {
    const patterns = inputPaths.length ? inputPaths : ["demo.css"];
    const files = await (0, fast_glob_1.default)(patterns, { ignore: opts.ignore ?? ["**/node_modules/**"], dot: false });
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
            // keep worst status
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
