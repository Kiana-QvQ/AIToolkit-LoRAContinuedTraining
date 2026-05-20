import prisma from '../prisma';
import { Job } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { TOOLKIT_ROOT, getTrainingFolder, getHFToken } from '../paths';
import { resolvePythonPath } from '../pythonPath';
const isWindows = process.platform === 'win32';
const STARTUP_GRACE_MS = 4000;

const startAndWatchJob = (job: Job) => {
  // starts and watches the job asynchronously
  return new Promise<void>(async (resolve, reject) => {
    const jobID = job.id;

    // setup the training
    const trainingRoot = await getTrainingFolder();

    const trainingFolder = path.join(trainingRoot, job.name);
    if (!fs.existsSync(trainingFolder)) {
      fs.mkdirSync(trainingFolder, { recursive: true });
    }

    // make the config file
    const configPath = path.join(trainingFolder, '.job_config.json');

    //log to path
    const logPath = path.join(trainingFolder, 'log.txt');

    try {
      // if the log path exists, move it to a folder called logs and rename it {num}_log.txt, looking for the highest num
      // if the log path does not exist, create it
      if (fs.existsSync(logPath)) {
        const logsFolder = path.join(trainingFolder, 'logs');
        if (!fs.existsSync(logsFolder)) {
          fs.mkdirSync(logsFolder, { recursive: true });
        }

        let num = 0;
        while (fs.existsSync(path.join(logsFolder, `${num}_log.txt`))) {
          num++;
        }

        fs.renameSync(logPath, path.join(logsFolder, `${num}_log.txt`));
      }
    } catch (e) {
      console.error('Error moving log file:', e);
    }

    // update the config dataset path
    const jobConfig = JSON.parse(job.job_config);
    jobConfig.config.process[0].sqlite_db_path = path.join(TOOLKIT_ROOT, 'aitk_db.db');

    // write the config file
    fs.writeFileSync(configPath, JSON.stringify(jobConfig, null, 2));

    const pythonPath = resolvePythonPath();

    const runFilePath = path.join(TOOLKIT_ROOT, 'run.py');
    if (!fs.existsSync(runFilePath)) {
      console.error(`run.py not found at path: ${runFilePath}`);
      await prisma.job.update({
        where: { id: jobID },
        data: {
          status: 'error',
          info: `Error launching job: run.py not found`,
        },
      });
      return;
    }

    const additionalEnv: any = {
      AITK_JOB_ID: jobID,
      CUDA_DEVICE_ORDER: 'PCI_BUS_ID',
      CUDA_VISIBLE_DEVICES: `${job.gpu_ids}`,
      IS_AI_TOOLKIT_UI: '1',
      PYTHONNOUSERSITE: '1',
    };

    // HF_TOKEN
    const hfToken = await getHFToken();
    if (hfToken && hfToken.trim() !== '') {
      additionalEnv.HF_TOKEN = hfToken;
    }

    // Add the --log argument to the command
    const args = [runFilePath, configPath, '--log', logPath];

    try {
      let subprocess;

      if (isWindows) {
        // Spawn Python directly on Windows so the process can survive parent exit
        subprocess = spawn(pythonPath, args, {
          env: {
            ...process.env,
            ...additionalEnv,
          },
          cwd: TOOLKIT_ROOT,
          detached: true,
          windowsHide: true,
          stdio: 'ignore', // don't tie stdio to parent
        });
      } else {
        // For non-Windows platforms, fully detach and ignore stdio so it survives daemon-like
        subprocess = spawn(pythonPath, args, {
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            ...additionalEnv,
          },
          cwd: TOOLKIT_ROOT,
        });
      }

      // Save the PID to the database and a file for future management (stop/inspect)
      const pid = subprocess.pid ?? null;
      if (pid != null) {
        await prisma.job.update({
          where: { id: jobID },
          data: { pid },
        });
      }
      try {
        fs.writeFileSync(path.join(trainingFolder, 'pid.txt'), String(pid ?? ''), { flag: 'w' });
      } catch (e) {
        console.error('Error writing pid file:', e);
      }

      // Detached jobs can fail before Python has a chance to create log.txt.
      // Give the child a brief grace period; if it exits immediately, surface
      // that as a startup error instead of leaving the job stuck as "running".
      const exitedQuickly = await new Promise<{ exited: boolean; code: number | null; signal: NodeJS.Signals | null }>(
        resolveExit => {
          let settled = false;
          const settle = (result: { exited: boolean; code: number | null; signal: NodeJS.Signals | null }) => {
            if (settled) return;
            settled = true;
            resolveExit(result);
          };

          const timer = setTimeout(() => settle({ exited: false, code: null, signal: null }), STARTUP_GRACE_MS);
          subprocess.once('exit', (code, signal) => {
            clearTimeout(timer);
            settle({ exited: true, code, signal });
          });
          subprocess.once('error', () => {
            clearTimeout(timer);
            settle({ exited: true, code: null, signal: null });
          });
        },
      );

      if (exitedQuickly.exited) {
        const startupMessage = `Job failed during startup${exitedQuickly.code !== null ? ` (exit code ${exitedQuickly.code})` : ''}${exitedQuickly.signal ? ` (${exitedQuickly.signal})` : ''}`;
        try {
          if (!fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, `${startupMessage}\n`, { flag: 'w' });
          } else {
            fs.appendFileSync(logPath, `\n${startupMessage}\n`);
          }
        } catch (e) {
          console.error('Error writing startup failure log:', e);
        }

        await prisma.job.update({
          where: { id: jobID },
          data: {
            status: 'error',
            info: startupMessage,
          },
        });
        resolve();
        return;
      }

      // Important: let the child run independently of this Node process.
      if (subprocess.unref) {
        subprocess.unref();
      }

      // (No stdout/stderr listeners — logging should go to --log handled by your Python)
      // (No monitoring loop — the whole point is to let it live past this worker)
    } catch (error: any) {
      // Handle any exceptions during process launch
      console.error('Error launching process:', error);

      await prisma.job.update({
        where: { id: jobID },
        data: {
          status: 'error',
          info: `Error launching job: ${error?.message || 'Unknown error'}`,
        },
      });
      return;
    }
    // Resolve the promise immediately after starting the process
    resolve();
  });
};

export default async function startJob(jobID: string) {
  const job: Job | null = await prisma.job.findUnique({
    where: { id: jobID },
  });
  if (!job) {
    console.error(`Job with ID ${jobID} not found`);
    return;
  }
  // update job status to 'running', this will run sync so we don't start multiple jobs.
  await prisma.job.update({
    where: { id: jobID },
    data: {
      status: 'running',
      stop: false,
      info: 'Starting job...',
    },
  });
  // start and watch the job asynchronously so the cron can continue
  startAndWatchJob(job);
}
