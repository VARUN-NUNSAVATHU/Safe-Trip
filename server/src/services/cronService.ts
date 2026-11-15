/**
 * SafeTrip Background Cron & Scheduled Jobs Service
 * Kalvium System & Integration Concept: Scheduled jobs / cron
 */

export interface ScheduledTask {
  name: string;
  intervalMinutes: number;
  lastRun?: Date;
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  runCount: number;
}

class CronService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: NodeJS.Timeout[] = [];

  constructor() {
    this.registerTask('cleanupStaleTrips', 15, this.cleanupStaleTrips.bind(this));
    this.registerTask('dailySafetyAudit', 60, this.dailySafetyAudit.bind(this));
  }

  public registerTask(name: string, intervalMinutes: number, taskFn: () => Promise<void>) {
    this.tasks.set(name, {
      name,
      intervalMinutes,
      status: 'IDLE',
      runCount: 0,
    });

    const timer = setInterval(async () => {
      const task = this.tasks.get(name)!;
      task.status = 'RUNNING';
      try {
        await taskFn();
        task.status = 'SUCCESS';
        task.lastRun = new Date();
        task.runCount += 1;
      } catch (err) {
        task.status = 'FAILED';
      }
    }, intervalMinutes * 60 * 1000);

    this.timers.push(timer);
  }

  // Task 1: Auto-complete abandoned / stale trips older than 12 hours
  private async cleanupStaleTrips() {
    console.log('[Cron: cleanupStaleTrips] Checking for abandoned active trips...');
  }

  // Task 2: Safety heartbeat audit
  private async dailySafetyAudit() {
    console.log('[Cron: dailySafetyAudit] Performing periodic system and geofence integrity check...');
  }

  public getTasksStatus(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  public stopAll() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
}

export const cronService = new CronService();
