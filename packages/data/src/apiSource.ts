import type { BaselineSource, ResolveOptions, FeatureInfo } from './types';

type ApiBaseline = { status?: 'widely'|'newly'|'limited'|'unknown'; date?: string };
type ApiFeature  = { id: string; name?: string; baseline?: ApiBaseline };
type ApiResponse = { results?: ApiFeature[] };

export class ApiSource implements BaselineSource {
  constructor(private base = 'https://api.webstatus.dev/v1') {}

  async resolve(ids: string[], opts?: ResolveOptions) {
    const map: Record<string, FeatureInfo> = {};
    if (ids.length === 0) return map;

    const q = ids.map(id => `id:${encodeURIComponent(id)}`).join(' OR ');
    const url = `${opts?.apiBase ?? this.base}/features?q=${q}`;

    const res = await fetch(url, { signal: opts?.signal });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);

    // Narrow the unknown
    const json = (await res.json()) as ApiResponse;
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
      if (!map[id]) map[id] = { id, baseline: 'unknown' };
    }
    return map;
  }
}
