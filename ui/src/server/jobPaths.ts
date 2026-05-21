import fs from 'fs';
import path from 'path';
import { Job } from '@prisma/client';
import { defaultTrainFolder } from '@/paths';
import { AUTODL_TMP, isAutodlLayout } from '@/server/autodlPaths';
import { getTrainingFolder } from '@/server/settings';

/** training_folder from saved job config (checkpoints / loss_log.db). */
export function getTrainingFolderFromJobConfig(job: Job): string | null {
  try {
    const cfg = JSON.parse(job.job_config);
    const tf = cfg?.config?.process?.[0]?.training_folder;
    return typeof tf === 'string' && tf.trim() !== '' ? tf.trim() : null;
  } catch {
    return null;
  }
}

function pushUnique(dirs: string[], root: string | null | undefined, jobName: string) {
  if (!root?.trim()) return;
  const d = path.join(root.trim(), jobName);
  if (!dirs.includes(d)) dirs.push(d);
}

/** All plausible per-job output directories (cron --log vs YAML training_folder may differ). */
export async function listJobOutputDirCandidates(job: Job): Promise<string[]> {
  const dirs: string[] = [];
  pushUnique(dirs, await getTrainingFolder(), job.name);
  pushUnique(dirs, getTrainingFolderFromJobConfig(job), job.name);
  pushUnique(dirs, defaultTrainFolder, job.name);
  if (isAutodlLayout()) {
    pushUnique(dirs, path.join(AUTODL_TMP, 'training'), job.name);
    pushUnique(dirs, path.join(AUTODL_TMP, 'output'), job.name);
  }
  return dirs;
}

function logFileSize(logPath: string): number {
  try {
    if (fs.existsSync(logPath)) return fs.statSync(logPath).size;
  } catch {
    /* ignore */
  }
  return 0;
}

/** Prefer the directory that actually contains log.txt (largest non-empty wins). */
export async function resolveJobDirForLog(job: Job): Promise<string> {
  const candidates = await listJobOutputDirCandidates(job);
  let bestDir: string | null = null;
  let bestSize = 0;

  for (const dir of candidates) {
    const size = logFileSize(path.join(dir, 'log.txt'));
    if (size > bestSize) {
      bestSize = size;
      bestDir = dir;
    }
  }
  if (bestDir) return bestDir;

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  return candidates[0] ?? path.join(defaultTrainFolder, job.name);
}

/** Prefer dir with loss_log.db / config.yaml (training artifacts). */
export async function resolveJobDirForArtifacts(job: Job): Promise<string> {
  const candidates = await listJobOutputDirCandidates(job);
  for (const dir of candidates) {
    if (
      fs.existsSync(path.join(dir, 'loss_log.db')) ||
      fs.existsSync(path.join(dir, 'config.yaml'))
    ) {
      return dir;
    }
  }
  const configRoot = getTrainingFolderFromJobConfig(job);
  if (configRoot) return path.join(configRoot, job.name);
  return resolveJobDirForLog(job);
}
