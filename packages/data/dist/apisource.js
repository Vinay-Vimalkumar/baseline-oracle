"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiSource = void 0;
class ApiSource {
    constructor(base = 'https://api.webstatus.dev/v1') {
        this.base = base;
    }
    async resolve(ids, opts) {
        const map = {};
        if (ids.length === 0)
            return map;
        const q = ids.map(id => `id:${encodeURIComponent(id)}`).join(' OR ');
        const url = `${opts?.apiBase ?? this.base}/features?q=${q}`;
        const res = await fetch(url, { signal: opts?.signal });
        if (!res.ok)
            throw new Error(`API ${res.status}: ${await res.text()}`);
        // Narrow the unknown
        const json = (await res.json());
        const results = json.results ?? [];
        for (const r of results) {
            map[r.id] = {
                id: r.id,
                name: r.name,
                baseline: (r.baseline?.status ?? 'unknown'),
                baseline_date: r.baseline?.date ?? undefined,
            };
        }
        // Fill any missing ids as unknown
        for (const id of ids) {
            if (!map[id])
                map[id] = { id, baseline: 'unknown' };
        }
        return map;
    }
}
exports.ApiSource = ApiSource;
