import { PrismaClient } from '@prisma/client';
import { defaultDatasetsFolder, defaultDataRoot } from '@/paths';
import { defaultTrainFolder } from '@/paths';
import { getAutodlFolderDefaults, isAutodlLayout } from '@/server/autodlPaths';
import NodeCache from 'node-cache';
import fs from 'fs';

const myCache = new NodeCache();
const prisma = new PrismaClient();

export const flushCache = () => {
  myCache.flushAll();
};

async function getSettingOrAutodl(
  key: string,
  autodlKey: keyof NonNullable<ReturnType<typeof getAutodlFolderDefaults>>,
  fallback: string,
) {
  const cached = myCache.get(key) as string;
  if (cached) return cached;

  const row = await prisma.settings.findFirst({ where: { key } });
  if (row?.value && row.value !== '') {
    myCache.set(key, row.value);
    return row.value as string;
  }

  const autodl = getAutodlFolderDefaults();
  if (autodl && autodlKey in autodl) {
    const v = autodl[autodlKey as keyof typeof autodl] as string;
    if (v) {
      myCache.set(key, v);
      return v;
    }
  }
  myCache.set(key, fallback);
  return fallback;
}

export const getDatasetsRoot = async () => {
  const autodl = getAutodlFolderDefaults();
  const fallback = autodl?.DATASETS_FOLDER || defaultDatasetsFolder;
  return getSettingOrAutodl('DATASETS_FOLDER', 'DATASETS_FOLDER', fallback);
};

export const getTrainingFolder = async () => {
  const autodl = getAutodlFolderDefaults();
  const fallback = autodl?.TRAINING_FOLDER || defaultTrainFolder;
  return getSettingOrAutodl('TRAINING_FOLDER', 'TRAINING_FOLDER', fallback);
};

export const getHFToken = async () => {
  const key = 'HF_TOKEN';
  let token = myCache.get(key) as string;
  if (token) {
    return token;
  }
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  token = '';
  if (row?.value && row.value !== '') {
    token = row.value;
  }
  myCache.set(key, token);
  return token;
};

export const getHFHome = async (): Promise<string> => {
  const autodl = getAutodlFolderDefaults();
  const fallback = autodl?.HF_HOME || process.env.HF_HOME || '';
  return getSettingOrAutodl('HF_HOME', 'HF_HOME', fallback);
};

export const getLorasFolder = async () => {
  const autodl = getAutodlFolderDefaults();
  const fallback = autodl?.LORAS_FOLDER || defaultTrainFolder;
  return getSettingOrAutodl('LORAS_FOLDER', 'LORAS_FOLDER', fallback);
};

export const getModelsFolder = async () => {
  const autodl = getAutodlFolderDefaults();
  const fallback = autodl?.MODELS_FOLDER || defaultDataRoot;
  return getSettingOrAutodl('MODELS_FOLDER', 'MODELS_FOLDER', fallback);
};

export const getLoraScanDirs = async (): Promise<string[]> => {
  const loras = await getLorasFolder();
  const training = await getTrainingFolder();
  const dirs = [loras, training];
  if (isAutodlLayout()) {
    const autodl = getAutodlFolderDefaults();
    if (autodl?.LORA_SCAN_DIRS) {
      dirs.push(...autodl.LORA_SCAN_DIRS);
    }
  }
  return [...new Set(dirs.filter(d => d && fs.existsSync(d)))];
};

export const getDataRoot = async () => {
  const key = 'DATA_ROOT';
  let dataRoot = myCache.get(key) as string;
  if (dataRoot) {
    return dataRoot;
  }
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  dataRoot = defaultDataRoot;
  if (row?.value && row.value !== '') {
    dataRoot = row.value;
  }
  myCache.set(key, dataRoot);
  return dataRoot;
};
