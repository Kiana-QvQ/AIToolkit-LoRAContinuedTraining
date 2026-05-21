import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getBaseLoraUploadDir } from '@/server/baseLoraPaths';
import { getLorasFolder } from '@/server/settings';

export async function POST(request: NextRequest) {
  try {
    const lorasFolder = await getLorasFolder();
    if (!lorasFolder) {
      return NextResponse.json({ error: 'LoRAs folder not found' }, { status: 500 });
    }
    const uploadDir = getBaseLoraUploadDir(lorasFolder);

    const formData = await request.formData();
    let files = formData.getAll('files');
    if (!files || files.length === 0) {
      const single = formData.get('file');
      files = single ? [single] : [];
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    await mkdir(uploadDir, { recursive: true });

    const savedFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, buffer);
      savedFiles.push(filePath);
    }

    return NextResponse.json({
      message: 'LoRA files uploaded successfully',
      files: savedFiles,
      path: savedFiles[0] || null,
      targetDir: uploadDir,
      lorasRoot: lorasFolder,
    });
  } catch (error) {
    console.error('LoRA upload error:', error);
    return NextResponse.json({ error: 'Error uploading LoRA files' }, { status: 500 });
  }
}
