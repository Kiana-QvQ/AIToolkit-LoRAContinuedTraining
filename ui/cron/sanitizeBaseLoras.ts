import fs from 'fs';

/** 开训前去掉本机/不存在路径，避免 run.py 报 Base LoRA path does not exist */
export function sanitizeBaseLorasInJobConfig(jobConfig: any): { stripped: string[] } {
  const stripped: string[] = [];
  const proc = jobConfig?.config?.process?.[0];
  const bl = proc?.network?.base_loras;
  if (!Array.isArray(bl)) {
    return { stripped };
  }

  const kept: { path: string; strength?: number }[] = [];
  for (const b of bl) {
    const p = String(b?.path ?? '').trim();
    if (!p) continue;
    if (/^[a-zA-Z]:[\\/]/.test(p) || /^[a-zA-Z]:\//.test(p)) {
      stripped.push(p);
      continue;
    }
    if (!p.startsWith('/')) {
      stripped.push(p);
      continue;
    }
    try {
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
        stripped.push(p);
        continue;
      }
    } catch {
      stripped.push(p);
      continue;
    }
    kept.push({ ...b, path: p });
  }

  proc.network.base_loras = kept;
  return { stripped };
}
