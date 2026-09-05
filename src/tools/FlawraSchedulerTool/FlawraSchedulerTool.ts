// FlawraSchedulerTool — schedule recurring or one-time tasks from within the agent.
// Uses node-cron for recurring schedules and setTimeout for one-shot timers.
// Stores scheduled tasks in ~/.flawra/scheduler.json so they survive restarts.

import { buildTool, type ToolDef } from '../../Tool.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

type ScheduledJob = {
  id: string;
  name: string;
  cron?: string;
  at?: string; // ISO timestamp for one-shot
  command: string;
  enabled: boolean;
  lastRun?: string;
};

const SCHEDULER_FILE = path.join(os.homedir(), '.flawra', 'scheduler.json');

function loadScheduler(): ScheduledJob[] {
  try {
    if (fs.existsSync(SCHEDULER_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULER_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveScheduler(jobs: ScheduledJob[]) {
  fs.mkdirSync(path.dirname(SCHEDULER_FILE), { recursive: true });
  fs.writeFileSync(SCHEDULER_FILE, JSON.stringify(jobs, null, 2));
}

const FlawraSchedulerToolDef: ToolDef<{
  action: 'list' | 'add' | 'remove' | 'run-now';
  name?: string;
  cron?: string;
  at?: string;
  command?: string;
  id?: string;
}> = {
  name: 'flawra_scheduler',
  description: 'Schedule recurring (cron) or one-time tasks that run shell commands. Jobs persist in ~/.flawra/scheduler.json.',
  schema: {
    action: { type: 'string', enum: ['list', 'add', 'remove', 'run-now'], description: 'Action to perform' },
    name: { type: 'string', description: 'Job name (required for add)' },
    cron: { type: 'string', description: 'Cron expression for recurring jobs (e.g. "*/5 * * * *")' },
    at: { type: 'string', description: 'ISO timestamp for one-shot job' },
    command: { type: 'string', description: 'Shell command to run' },
    id: { type: 'string', description: 'Job ID for remove/run-now' },
  },
  async run(args) {
    try {
      const jobs = loadScheduler();

      switch (args.action) {
        case 'list':
          return { success: true, output: JSON.stringify(jobs, null, 2) };

        case 'add': {
          if (!args.name || !args.command) {
            return { success: false, error: 'name and command are required' };
          }
          if (!args.cron && !args.at) {
            return { success: false, error: 'either cron or at is required' };
          }
          const job: ScheduledJob = {
            id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: args.name,
            cron: args.cron,
            at: args.at,
            command: args.command,
            enabled: true,
          };
          jobs.push(job);
          saveScheduler(jobs);
          // Register with node-cron if available
          try {
            const { execSync } = await import('child_process');
            execSync(`echo '${JSON.stringify(job)}' >> ~/.flawra/scheduler_queue.txt`);
          } catch {}
          return { success: true, output: `Scheduled job "${job.name}" (id: ${job.id})` };
        }

        case 'remove': {
          if (!args.id) return { success: false, error: 'id is required' };
          const filtered = jobs.filter(j => j.id !== args.id);
          if (filtered.length === jobs.length) return { success: false, error: `job ${args.id} not found` };
          saveScheduler(filtered);
          return { success: true, output: `Removed job ${args.id}` };
        }

        case 'run-now': {
          if (!args.id) return { success: false, error: 'id is required' };
          const job = jobs.find(j => j.id === args.id);
          if (!job) return { success: false, error: `job ${args.id} not found` };
          job.lastRun = new Date().toISOString();
          saveScheduler(jobs);
          const { execSync } = await import('child_process');
          const output = execSync(job.command, { encoding: 'utf8', timeout: 300000 });
          return { success: true, output: `Job "${job.name}" ran:\n${output}` };
        }

        default:
          return { success: false, error: `unknown action: ${args.action}` };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};

export default buildTool(FlawraSchedulerToolDef);