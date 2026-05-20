import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getTrainingFolder } from '@/server/settings';

function walkSafetensors(dir: string, maxFiles: number = 2000) {
  const results: { path: string; size: number }[] = [];

  const walk = (currentDir: string) => {
    if (results.length >= maxFiles) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.safetensors')) {
        try {
          const stats = fs.statSync(fullPath);
          results.push({
            path: fullPath,
            size: stats.size,
          });
        } catch {
          // ignore unreadable files
        }
      }
    }
  };

  walk(dir);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function GET(_request: NextRequest) {
  const trainingFolder = await getTrainingFolder();
  const request = _request;
  const searchParams = request.nextUrl.searchParams;
  const targetDir = searchParams.get('dir')?.trim() || trainingFolder;

  if (!fs.existsSync(targetDir)) {
    return NextResponse.json({ files: [] });
  }
  const files = walkSafetensors(targetDir);
  return NextResponse.json({ files, scanned_dir: targetDir, default_dir: trainingFolder });
}
