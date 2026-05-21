import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getTrainingFolder, getLorasFolder, getLoraScanDirs } from '@/server/settings';

function walkSafetensors(dir: string, maxFiles: number = 2000) {
  const results: { path: string; size: number }[] = [];
  const seen = new Set<string>();

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
        if (seen.has(fullPath)) continue;
        seen.add(fullPath);
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
  return results;
}

export async function GET(_request: NextRequest) {
  const trainingFolder = await getTrainingFolder();
  const lorasFolder = await getLorasFolder();
  const scanDirs = await getLoraScanDirs();
  const request = _request;
  const searchParams = request.nextUrl.searchParams;
  const customDir = searchParams.get('dir')?.trim();

  if (customDir) {
    if (!fs.existsSync(customDir)) {
      return NextResponse.json({ files: [], scanned_dir: customDir, default_dir: lorasFolder || trainingFolder });
    }
    const files = walkSafetensors(customDir);
    return NextResponse.json({
      files,
      scanned_dir: customDir,
      default_dir: lorasFolder || trainingFolder,
      scan_dirs: scanDirs,
    });
  }

  const merged: { path: string; size: number }[] = [];
  const seen = new Set<string>();
  for (const dir of scanDirs) {
    for (const f of walkSafetensors(dir, 2000 - merged.length)) {
      if (!seen.has(f.path)) {
        seen.add(f.path);
        merged.push(f);
      }
      if (merged.length >= 2000) break;
    }
    if (merged.length >= 2000) break;
  }

  merged.sort((a, b) => a.path.localeCompare(b.path));
  const defaultDir = lorasFolder || trainingFolder;
  const scannedDir = scanDirs.join(',') || defaultDir;

  return NextResponse.json({
    files: merged,
    scanned_dir: scannedDir,
    default_dir: defaultDir,
    scan_dirs: scanDirs,
  });
}
