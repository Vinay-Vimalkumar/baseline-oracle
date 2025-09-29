export type BaselineStatus = 'widely' | 'newly' | 'limited' | 'unknown';

export interface FeatureInfo {
  id: string;
  name?: string;
  baseline?: BaselineStatus;
  baseline_date?: string;
}

export interface ResolveOptions {
  source?: 'local' | 'api';
  snapshot?: string;  // 'YYYY-MM' or 'latest' for local
  apiBase?: string;
  signal?: AbortSignal;
}

export interface BaselineSource {
  resolve(ids: string[], opts?: ResolveOptions): Promise<Record<string, FeatureInfo>>;
}
