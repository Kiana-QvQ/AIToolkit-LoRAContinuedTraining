/** 客户端模型路径提示（与 server/autodlPaths 规则一致，不访问 fs） */

export function isHfRepoId(modelPath: string): boolean {
  const p = modelPath?.trim() || '';
  if (!p || p.startsWith('/')) return false;
  if (p.endsWith('.safetensors') || p.endsWith('.ckpt')) return false;
  return true;
}

/** 误填的「底模目录」而非可加载模型 */
export function isBareModelsContainerPath(modelPath: string): boolean {
  const p = modelPath?.trim().replace(/\\/g, '/').replace(/\/+$/, '') || '';
  if (!p.startsWith('/')) return false;
  if (p.endsWith('.safetensors') || p.endsWith('.ckpt')) return false;
  if (p.endsWith('/models') || p.endsWith('/model')) return true;
  if (p === '/root/autodl-tmp/models' || p === '/root/autodl-tmp/model') return true;
  return false;
}

export function formatModelPathLabel(modelPath: string): string {
  const p = modelPath?.trim() || '';
  if (!p) return '';
  if (isHfRepoId(p)) return `${p}（在线 / 共用 HF 缓存）`;
  if (p.endsWith('.safetensors') || p.endsWith('.ckpt')) {
    const name = p.split('/').pop() || p;
    return `${name}（秋叶 ckpt）`;
  }
  if (p.includes('/snapshots/')) {
    const parts = p.split('/');
    const hash = parts[parts.indexOf('snapshots') + 1] || '';
    return `HF 缓存 …/${hash.slice(0, 8)}`;
  }
  return p.length > 72 ? `…${p.slice(-68)}` : p;
}

export function pickSd15PathFromSettings(settings: {
  SD15_MODEL_PATH_DEFAULT?: string;
  SD15_MODEL_PATHS?: string[];
}): string {
  const d = settings.SD15_MODEL_PATH_DEFAULT?.trim();
  if (d && !isBareModelsContainerPath(d)) return d;
  for (const p of settings.SD15_MODEL_PATHS || []) {
    if (!isBareModelsContainerPath(p)) return p;
  }
  return 'runwayml/stable-diffusion-v1-5';
}

export function sanitizeNameOrPathForSave(
  arch: string,
  nameOrPath: string | null | undefined,
  settings: { SD15_MODEL_PATH_DEFAULT?: string; SD15_MODEL_PATHS?: string[] },
): string | null {
  const p = nameOrPath?.trim() || '';
  if (!p) return null;
  if (arch === 'sd15' && isBareModelsContainerPath(p)) {
    return pickSd15PathFromSettings(settings);
  }
  return p;
}
