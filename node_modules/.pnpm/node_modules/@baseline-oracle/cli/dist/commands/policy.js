"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policy = policy;
const fs_1 = __importDefault(require("fs"));
async function policy(scanPath, opts) {
    const scan = JSON.parse(fs_1.default.readFileSync(scanPath, "utf8"));
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
    }
    else {
        console.log("✅ Policy passed.");
    }
}
