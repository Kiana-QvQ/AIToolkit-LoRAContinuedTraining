import path from 'path';
import fs from 'fs';
import prisma from './prisma';

export const TOOLKIT_ROOT = path.resolve('@', '..', '..');
export const defaultTrainFolder = path.join(TOOLKIT_ROOT, 'output');
export const defaultDatasetsFolder = path.join(TOOLKIT_ROOT, 'datasets');
export const defaultDataRoot = path.join(TOOLKIT_ROOT, 'data');

console.log('TOOLKIT_ROOT:', TOOLKIT_ROOT);

/** Align with ui/src/server/settings.ts so --log and API read the same folder. */
export const getTrainingFolder = async () => {
  const key = 'TRAINING_FOLDER';
  const row = await prisma.settings.findFirst({ where: { key } });
  if (row?.value && row.value !== '') {
    return row.value as string;
  }
  const fromEnv = process.env.TRAINING_FOLDER?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.platform === 'linux' && fs.existsSync('/root/autodl-tmp')) {
    const candidates = [
      path.join('/root/autodl-tmp', 'training'),
      path.join('/root/autodl-tmp', 'output'),
      defaultTrainFolder,
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    return path.join('/root/autodl-tmp', 'training');
  }
  return defaultTrainFolder;
};

export const getHFToken = async () => {
  const key = 'HF_TOKEN';
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  let token = '';
  if (row?.value && row.value !== '') {
    token = row.value;
  }
  return token;
};

/** 与官方 ~/ai-toolkit（6006）共用：统一 HF 缓存目录 */
export const getHFHome = async (): Promise<string> => {
  const key = 'HF_HOME';
  let row = await prisma.settings.findFirst({ where: { key } });
  if (row?.value && row.value !== '') {
    return row.value as string;
  }
  if (process.env.HF_HOME && process.env.HF_HOME !== '') {
    return process.env.HF_HOME;
  }
  if (process.platform === 'linux' && fs.existsSync('/root/autodl-tmp')) {
    return '/root/autodl-tmp/huggingface_cache';
  }
  return '';
};
