"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalSource = void 0;
// @ts-ignore
const features_json_1 = __importDefault(require("web-features/data/features.json"));
// @ts-ignore
const baseline_status_json_1 = __importDefault(require("web-features/data/baseline-status.json"));
// @ts-ignore
const snapshots_json_1 = __importDefault(require("web-features/data/snapshots.json"));
function pickSnapshot(target) {
    const snaps = snapshots_json_1.default;
    if (!target || target === 'latest')
        return snaps[0] ?? null; // newest first
    return snaps.find(s => s.snapshot === target) ?? null;
}
class LocalSource {
    async resolve(ids, opts) {
        const map = {};
        const wf = features_json_1.default;
        const byId = Object.fromEntries(wf.map(f => [f.id, f]));
        const snap = pickSnapshot(opts?.snapshot);
        const baselineStatus = snap ? snap.baseline_status : baseline_status_json_1.default;
        const baselineDate = snap?.baseline_date ?? {};
        for (const id of ids) {
            const entry = byId[id];
            const status = baselineStatus[id] ?? 'unknown';
            map[id] = {
                id,
                name: entry?.name,
                baseline: status,
                baseline_date: baselineDate[id]
            };
        }
        return map;
    }
}
exports.LocalSource = LocalSource;
