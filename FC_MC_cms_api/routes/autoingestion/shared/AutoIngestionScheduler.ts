import CronTask from '../../shared/valueObjects/CronTask';
import { IScheduler } from '../../shared/scheduler/IScheduler';
import { Target } from '../../shared/scheduler/SchedulerAdaptor';

import AutoIngestion from './AutoIngestion';

export default class AutoIngestionScheduler {
  static scheduleName(autoIngestionId: string) {
    return `autoingestion-${autoIngestionId.toLowerCase()}-schedule`;
  }

  constructor(
    private readonly scheduler: IScheduler<Target>,
    private readonly schedulerArn: string,
    private readonly schedulerRoleArn: string,
  ) {}

  async schedule(autoIngestion: AutoIngestion): Promise<string> {
    const scheduleName = AutoIngestionScheduler.scheduleName(autoIngestion.id);
    await this.scheduler.schedule(
      scheduleName,
      new CronTask(autoIngestion.schedule, 'aws-cloud-watch'),
      autoIngestion.timezone,
      {
        Arn: this.schedulerArn,
        RoleArn: this.schedulerRoleArn,
        Input: JSON.stringify({
          autoIngestionId: autoIngestion.id,
        }),
      },
    );
    return scheduleName;
  }

  async remove(autoIngestion: AutoIngestion): Promise<void> {
    if (!autoIngestion.scheduler_id) return;
    await this.scheduler.removeSchedule(autoIngestion.scheduler_id);
  }

  async reschedule(autoIngestion: AutoIngestion): Promise<string> {
    await this.remove(autoIngestion);
    return this.schedule(autoIngestion);
  }
}
