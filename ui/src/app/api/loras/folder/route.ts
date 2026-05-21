import { NextResponse } from 'next/server';
import { getLorasFolder } from '@/server/settings';
import { getBaseLoraUploadDir } from '@/server/baseLoraPaths';
import { mkdir } from 'fs/promises';

export async function GET() {
  const lorasRoot = await getLorasFolder();
  const uploadDir = getBaseLoraUploadDir(lorasRoot);
  await mkdir(uploadDir, { recursive: true });
  return NextResponse.json({
    loras_folder: lorasRoot,
    upload_dir: uploadDir,
    hint: 'Base LoRA 请上传到 upload_dir（数据盘），保存任务时使用返回的 path。',
  });
}
