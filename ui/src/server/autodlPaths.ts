import fs from 'fs';
import path from 'path';

/** AutoDL 数据盘 + 秋叶 lora-scripts / Jupyter 常用目录 */
export const AUTODL_TMP = '/root/autodl-tmp';
export const AUTODL_PUB = '/root/autodl-pub';
export const LORA_SCRIPTS_ROOT = '/root/lora-scripts';

export function isAutodlLayout(): boolean {
  return process.platform === 'linux' && fs.existsSync(AUTODL_TMP);
}

export function firstExistingDir(candidates: string[]): string | null {
  for (const dir of candidates) {
    if (dir && fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

export function getAutodlFolderDefaults() {
  if (!isAutodlLayout()) {
    return null;
  }

  const hfHome = process.env.HF_HOME || path.join(AUTODL_TMP, 'huggingface_cache');

  const datasetsFolder =
    firstExistingDir([
      path.join(AUTODL_TMP, 'train'), // 秋叶 运行.ipynb 常用
      path.join(LORA_SCRIPTS_ROOT, 'train'),
      path.join(AUTODL_TMP, 'datasets'),
      path.join(AUTODL_TMP, 'dataset'),
    ]) || path.join(AUTODL_TMP, 'datasets');

  const trainingFolder =
    firstExistingDir([
      path.join(AUTODL_TMP, 'training'),
      path.join(AUTODL_TMP, 'output'),
      path.join(INSTALL_DIR_FALLBACK(), 'output'),
    ]) || path.join(AUTODL_TMP, 'training');

  const lorasFolder =
    firstExistingDir([
      path.join(AUTODL_TMP, 'loras'),
      path.join(AUTODL_TMP, 'output'),
      path.join(LORA_SCRIPTS_ROOT, 'output'),
      path.join(LORA_SCRIPTS_ROOT, 'outputs'),
    ]) || path.join(AUTODL_TMP, 'loras');

  const modelsFolder =
    firstExistingDir([
      path.join(AUTODL_TMP, 'models'),
      path.join(AUTODL_TMP, 'model'),
      path.join(LORA_SCRIPTS_ROOT, 'sd-models'),
      path.join(LORA_SCRIPTS_ROOT, 'models'),
      AUTODL_PUB,
    ]) || path.join(AUTODL_TMP, 'models');

  return {
    HF_HOME: hfHome,
    DATASETS_FOLDER: datasetsFolder,
    TRAINING_FOLDER: trainingFolder,
    LORAS_FOLDER: lorasFolder,
    MODELS_FOLDER: modelsFolder,
    SD15_MODEL_PATHS: discoverSd15ModelPaths(hfHome, modelsFolder),
    LORA_SCAN_DIRS: uniqueDirs([lorasFolder, trainingFolder, path.join(AUTODL_TMP, 'output')]),
  };
}

function INSTALL_DIR_FALLBACK(): string {
  return process.env.TOOLKIT_ROOT || process.env.INSTALL_DIR || '/root/ai-toolkit-gl';
}

function uniqueDirs(dirs: string[]): string[] {
  return [...new Set(dirs.filter(Boolean))];
}

/** Diffusers 目录（含 model_index.json），可被 from_pretrained 加载 */
export function isDiffusersPipelineDir(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, 'model_index.json'));
  } catch {
    return false;
  }
}

/** 是否可作为 SD1.5 的 name_or_path（勿把 /root/autodl-tmp/models 这种空目录填进去） */
export function isValidSd15ModelPath(modelPath: string): boolean {
  const p = modelPath?.trim();
  if (!p) return false;
  // HuggingFace repo id（如 runwayml/stable-diffusion-v1-5）
  if (!path.isAbsolute(p) && !p.endsWith('.safetensors') && !p.endsWith('.ckpt')) {
    return true;
  }
  if (p.endsWith('.safetensors') || p.endsWith('.ckpt')) {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  }
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory() && isDiffusersPipelineDir(p);
  } catch {
    return false;
  }
}

/** 自动默认：第一个合法本地路径，否则 HF repo */
export function pickDefaultSd15ModelPath(paths: string[]): string {
  for (const p of paths) {
    if (isValidSd15ModelPath(p) && p.startsWith('/')) return p;
  }
  return 'runwayml/stable-diffusion-v1-5';
}

/** 本地路径优先；仅收录可加载路径（不含裸 models 目录） */
export function discoverSd15ModelPaths(hfHome: string, modelsFolder: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (p: string) => {
    const v = p.trim();
    if (!v || seen.has(v) || !isValidSd15ModelPath(v)) return;
    seen.add(v);
    found.push(v);
  };

  // 1) HuggingFace 缓存快照（download_sd15.py）
  const hubSd15 = path.join(hfHome, 'hub', 'models--runwayml--stable-diffusion-v1-5', 'snapshots');
  if (fs.existsSync(hubSd15)) {
    try {
      for (const snap of fs.readdirSync(hubSd15)) {
        add(path.join(hubSd15, snap));
      }
    } catch {
      /* ignore */
    }
  }

  // 2) autodl-pub 预置 SD1.5（须为 diffusers 目录）
  for (const pubName of [
    'stable-diffusion-v1-5',
    'sd1.5',
    'SD1.5',
    'runwayml-stable-diffusion-v1-5',
  ]) {
    add(path.join(AUTODL_PUB, pubName));
  }

  // 3) 秋叶：autodl-tmp/models/Stable-diffusion/*.safetensors（单文件 ckpt）
  walkShallowModelFiles(modelsFolder, 4).forEach(add);

  // 4) models 下任意含 model_index.json 的子目录
  findDiffusersModelDirs(modelsFolder, 4).forEach(add);
  if (fs.existsSync(AUTODL_PUB)) {
    findDiffusersModelDirs(AUTODL_PUB, 3).forEach(add);
  }

  // 5) 在线 repo（始终可用，放最后作兜底）
  const hfRepo = 'runwayml/stable-diffusion-v1-5';
  if (!seen.has(hfRepo)) {
    found.push(hfRepo);
  }

  return found;
}

function findDiffusersModelDirs(root: string, maxDepth: number): string[] {
  const results: string[] = [];
  if (!fs.existsSync(root)) return results;

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    if (isDiffusersPipelineDir(dir)) {
      results.push(dir);
      return;
    }
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        walk(path.join(dir, e.name), depth + 1);
      }
    }
  };
  walk(root, 0);
  return results;
}

function walkShallowModelFiles(root: string, maxDepth: number): string[] {
  const results: string[] = [];
  if (!fs.existsSync(root)) return results;

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
      } else if (
        e.isFile() &&
        (e.name.endsWith('.safetensors') || e.name.endsWith('.ckpt')) &&
        /sd|v1-5|1\.5/i.test(e.name)
      ) {
        results.push(full);
      }
    }
  };
  walk(root, 0);
  return results;
}

export async function getSettingValue(key: string, prisma: { settings: { findFirst: Function } }): Promise<string> {
  const row = await prisma.settings.findFirst({ where: { key } });
  return (row?.value as string) || '';
}

export type ResolvedAutodlSettings = {
  TRAINING_FOLDER: string;
  DATASETS_FOLDER: string;
  LORAS_FOLDER?: string;
  MODELS_FOLDER?: string;
  HF_HOME?: string;
  SD15_MODEL_PATHS: string[];
  SD15_MODEL_PATH_DEFAULT?: string;
  LORA_SCAN_DIRS: string[];
  IS_AUTODL: boolean;
};

export async function resolveSettingsWithAutodl(
  prisma: { settings: { findFirst: Function } },
  defaults: { TRAINING_FOLDER: string; DATASETS_FOLDER: string },
): Promise<ResolvedAutodlSettings> {
  const autodl = getAutodlFolderDefaults();

  const pick = async (
    key: 'TRAINING_FOLDER' | 'DATASETS_FOLDER' | 'LORAS_FOLDER' | 'MODELS_FOLDER' | 'HF_HOME',
    autodlKey: 'DATASETS_FOLDER' | 'TRAINING_FOLDER' | 'LORAS_FOLDER' | 'MODELS_FOLDER' | 'HF_HOME',
    fallback: string,
  ) => {
    const db = await getSettingValue(key, prisma);
    if (db) return db;
    if (autodl && autodl[autodlKey]) {
      return autodl[autodlKey];
    }
    return fallback;
  };

  const trainingFolder = await pick('TRAINING_FOLDER', 'TRAINING_FOLDER', defaults.TRAINING_FOLDER);
  const datasetsFolder = await pick('DATASETS_FOLDER', 'DATASETS_FOLDER', defaults.DATASETS_FOLDER);
  const lorasFolder = await pick('LORAS_FOLDER', 'LORAS_FOLDER', autodl?.LORAS_FOLDER || path.join(AUTODL_TMP, 'loras'));
  const modelsFolder = await pick('MODELS_FOLDER', 'MODELS_FOLDER', autodl?.MODELS_FOLDER || path.join(AUTODL_TMP, 'models'));
  const hfHome = await pick('HF_HOME', 'HF_HOME', autodl?.HF_HOME || path.join(AUTODL_TMP, 'huggingface_cache'));

  const sd15Paths = discoverSd15ModelPaths(hfHome, modelsFolder);
  const loraDirs = uniqueDirs([
    lorasFolder,
    trainingFolder,
    path.join(AUTODL_TMP, 'output'),
    ...(autodl?.LORA_SCAN_DIRS || []),
  ]).filter(d => fs.existsSync(d));

  return {
    TRAINING_FOLDER: trainingFolder,
    DATASETS_FOLDER: datasetsFolder,
    LORAS_FOLDER: lorasFolder,
    MODELS_FOLDER: modelsFolder,
    HF_HOME: hfHome,
    SD15_MODEL_PATHS: sd15Paths.length > 0 ? sd15Paths : ['runwayml/stable-diffusion-v1-5'],
    SD15_MODEL_PATH_DEFAULT: pickDefaultSd15ModelPath(
      sd15Paths.length > 0 ? sd15Paths : ['runwayml/stable-diffusion-v1-5'],
    ),
    LORA_SCAN_DIRS: loraDirs,
    IS_AUTODL: !!autodl,
  };
}
