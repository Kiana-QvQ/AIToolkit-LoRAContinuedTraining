import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { defaultTrainFolder, defaultDatasetsFolder } from '@/paths';
import { flushCache } from '@/server/settings';
import { resolveSettingsWithAutodl } from '@/server/autodlPaths';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    const settingsObject = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    const resolved = await resolveSettingsWithAutodl(prisma, {
      TRAINING_FOLDER: settingsObject.TRAINING_FOLDER || defaultTrainFolder,
      DATASETS_FOLDER: settingsObject.DATASETS_FOLDER || defaultDatasetsFolder,
    });

    return NextResponse.json({
      HF_TOKEN: settingsObject.HF_TOKEN || '',
      TRAINING_FOLDER: resolved.TRAINING_FOLDER,
      DATASETS_FOLDER: resolved.DATASETS_FOLDER,
      LORAS_FOLDER: resolved.LORAS_FOLDER,
      MODELS_FOLDER: resolved.MODELS_FOLDER,
      HF_HOME: resolved.HF_HOME,
      SD15_MODEL_PATHS: resolved.SD15_MODEL_PATHS,
      SD15_MODEL_PATH_DEFAULT: resolved.SD15_MODEL_PATH_DEFAULT,
      LORA_SCAN_DIRS: resolved.LORA_SCAN_DIRS,
      IS_AUTODL: resolved.IS_AUTODL,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { HF_TOKEN, TRAINING_FOLDER, DATASETS_FOLDER, LORAS_FOLDER, MODELS_FOLDER, HF_HOME } = body;

    const upserts: Promise<unknown>[] = [
      prisma.settings.upsert({
        where: { key: 'HF_TOKEN' },
        update: { value: HF_TOKEN ?? '' },
        create: { key: 'HF_TOKEN', value: HF_TOKEN ?? '' },
      }),
      prisma.settings.upsert({
        where: { key: 'TRAINING_FOLDER' },
        update: { value: TRAINING_FOLDER },
        create: { key: 'TRAINING_FOLDER', value: TRAINING_FOLDER },
      }),
      prisma.settings.upsert({
        where: { key: 'DATASETS_FOLDER' },
        update: { value: DATASETS_FOLDER },
        create: { key: 'DATASETS_FOLDER', value: DATASETS_FOLDER },
      }),
    ];

    if (LORAS_FOLDER !== undefined) {
      upserts.push(
        prisma.settings.upsert({
          where: { key: 'LORAS_FOLDER' },
          update: { value: LORAS_FOLDER },
          create: { key: 'LORAS_FOLDER', value: LORAS_FOLDER },
        }),
      );
    }
    if (MODELS_FOLDER !== undefined) {
      upserts.push(
        prisma.settings.upsert({
          where: { key: 'MODELS_FOLDER' },
          update: { value: MODELS_FOLDER },
          create: { key: 'MODELS_FOLDER', value: MODELS_FOLDER },
        }),
      );
    }
    if (HF_HOME !== undefined) {
      upserts.push(
        prisma.settings.upsert({
          where: { key: 'HF_HOME' },
          update: { value: HF_HOME },
          create: { key: 'HF_HOME', value: HF_HOME },
        }),
      );
    }

    await Promise.all(upserts);
    flushCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
