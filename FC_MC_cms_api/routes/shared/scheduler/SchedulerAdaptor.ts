import { CreateScheduleCommand, DeleteScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';

import CronTask from '../valueObjects/CronTask';

import { IScheduler } from './IScheduler';
import { SchedulerError } from './SchedulerError';

export interface Target {
  RoleArn: string;
  Arn: string;
  Input: string;
}

export default class SchedulerAdaptor implements IScheduler<Target> {
  constructor(private readonly client: SchedulerClient) {
  }

  async schedule(
    name: string,
    cronTask: CronTask,
    timezone: string,
    target: Target,
  ): Promise<boolean> {
    try {
      const command = new CreateScheduleCommand({
        Name: name,
        FlexibleTimeWindow: {
          Mode: 'OFF',
        },
        ScheduleExpression: `cron(${cronTask.value()})`,
        Target: {
          ...target,
          RetryPolicy: {
            MaximumRetryAttempts: 0,
          },
        },
        ScheduleExpressionTimezone: timezone,
      });
      return !!await this.client.send(command);
    } catch (e) {
      throw new SchedulerError.UnableToCreateSchedule(e);
    }
  }

  async removeSchedule(name: string): Promise<boolean> {
    try {
      const command = new DeleteScheduleCommand({
        Name: name,
      });
      return !!await this.client.send(command);
    } catch (e) {
      throw new SchedulerError.UnableToDeleteSchedule(e);
    }
  }
}
