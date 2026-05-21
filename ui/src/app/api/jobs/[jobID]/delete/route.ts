import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { listJobOutputDirCandidates } from '@/server/jobPaths';
import fs from 'fs';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { jobID: string } }) {
  const { jobID } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobID },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const jobDirs = await listJobOutputDirCandidates(job);
  for (const trainingFolder of jobDirs) {
    if (fs.existsSync(trainingFolder)) {
      fs.rmSync(trainingFolder, { recursive: true, force: true });
    }
  }

  await prisma.job.delete({
    where: { id: jobID },
  });

  return NextResponse.json(job);
}
