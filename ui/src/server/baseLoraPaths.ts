import fs from 'fs';
import path from 'path';
import {
  BaseLoraEntry,
  filterClientOnlyBaseLoras,
  isServerAbsolutePath,
} from '@/utils/baseLoraPaths';
import { getLorasFolder } from '@/server/settings';

export type SanitizeBaseLorasResult = {
  entries: BaseLoraEntry[];
  removedClientPaths: string[];
  missingPaths: string[];
};

/** 保存/开训前：去掉本机路径，并检查 Linux 上文件是否存在 */
export async function sanitizeBaseLorasForServer(
  entries: BaseLoraEntry[] | undefined,
): Promise<SanitizeBaseLorasResult> {
  const lorasFolder = await getLorasFolder();
  const { kept, removed } = filterClientOnlyBaseLoras(entries);
  const entriesOut: BaseLoraEntry[] = [];
  const missingPaths: string[] = [];

  for (const e of kept) {
    const p = String(e.path ?? '').trim();
    if (!p) continue;
    if (!isServerAbsolutePath(p)) {
      missingPaths.push(p);
      continue;
    }
    let resolved = p;
    try {
      resolved = fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p);
    } catch {
      resolved = p;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      missingPaths.push(p);
      continue;
    }
    entriesOut.push({ ...e, path: resolved });
  }

  return {
    entries: entriesOut,
    removedClientPaths: removed,
    missingPaths,
  };
}

export function formatBaseLoraSaveError(result: SanitizeBaseLorasResult, lorasFolder: string): string {
  const parts: string[] = [];
  if (result.removedClientPaths.length) {
    parts.push(
      `已移除本机路径（训练机无法读取）：\n${result.removedClientPaths.join('\n')}`,
    );
  }
  if (result.missingPaths.length) {
    parts.push(
      `以下路径在服务器上不存在，请用 WebUI「浏览文件」上传或复制到 ${lorasFolder}：\n${result.missingPaths.join('\n')}`,
    );
  }
  return parts.join('\n\n');
}

/** 上传目录：数据盘持久化，重启实例后仍保留（autodl-tmp） */
export function getBaseLoraUploadDir(lorasRoot: string): string {
  return path.join(lorasRoot, 'base');
}
