/** Base LoRA 路径规则（客户端 + 与 server 共用的纯字符串判断） */

export type BaseLoraEntry = { path?: string; strength?: number };

/** 本机 Windows 路径，在 Linux 训练机上不可用 */
export function isClientOnlyPath(modelPath: string): boolean {
  const p = modelPath?.trim() || '';
  if (!p) return false;
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true;
  if (/^[a-zA-Z]:\//.test(p)) return true;
  return false;
}

export function isServerAbsolutePath(modelPath: string): boolean {
  return (modelPath?.trim() || '').startsWith('/');
}

export function getBaseLoraPathWarning(modelPath: string, lorasFolder?: string): string | null {
  const p = modelPath?.trim() || '';
  if (!p) return null;
  if (isClientOnlyPath(p)) {
    const hint = lorasFolder ? `请用「浏览文件」上传到 ${lorasFolder}，或 Jupyter 拷到该目录。` : '请用「浏览文件」上传到服务器 LoRA 目录。';
    return `这是本机路径，训练机在 Linux 上读不到：${p}。${hint}`;
  }
  if (!isServerAbsolutePath(p)) {
    return `请填写服务器绝对路径（以 / 开头），或使用「浏览文件」上传。`;
  }
  return null;
}

export function filterClientOnlyBaseLoras(entries: BaseLoraEntry[] | undefined): {
  kept: BaseLoraEntry[];
  removed: string[];
} {
  const kept: BaseLoraEntry[] = [];
  const removed: string[] = [];
  for (const e of entries || []) {
    const p = String(e?.path ?? '').trim();
    if (!p) continue;
    if (isClientOnlyPath(p)) {
      removed.push(p);
      continue;
    }
    kept.push({ ...e, path: p });
  }
  return { kept, removed };
}
