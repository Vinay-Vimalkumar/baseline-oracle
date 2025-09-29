import type { BaselineSource, ResolveOptions, FeatureInfo } from './types';

// @ts-ignore
import featuresJson from 'web-features/data/features.json';
// @ts-ignore
import baselineStatusJson from 'web-features/data/baseline-status.json';
// @ts-ignore
import snapshotsJson from 'web-features/data/snapshots.json';

type WFEntry = { id: string; name?: string };
type SnapshotEntry = {
  snapshot: string; // e.g. '2025-09'
  baseline_status: Record<string, 'widely'|'newly'|'limited'|'unknown'>;
  baseline_date?: Record<string, string|undefined>;
};

function pickSnapshot(target?: string): SnapshotEntry | null {
  const snaps = snapshotsJson as SnapshotEntry[];
  if (!target || target === 'latest') return snaps[0] ?? null; // newest first
  return snaps.find(s => s.snapshot === target) ?? null;
}

export class LocalSource implements BaselineSource {
  async resolve(ids: string[], opts?: ResolveOptions) {
    const map: Record<string, FeatureInfo> = {};
    const wf = featuresJson as WFEntry[];
    const byId: Record<string, WFEntry> = Object.fromEntries(wf.map(f => [f.id, f]));

    const snap = pickSnapshot(opts?.snapshot);
    const baselineStatus = snap ? snap.baseline_status : (baselineStatusJson as Record<string, string>);
    const baselineDate = snap?.baseline_date ?? {};

    for (const id of ids) {
      const entry = byId[id];
      const status = (baselineStatus[id] as FeatureInfo['baseline']) ?? 'unknown';
      map[id] = {
        id,
        name: entry?.name,
        baseline: status,
        baseline_date: (baselineDate as Record<string,string|undefined>)[id]
      };
    }
    return map;
  }
}
