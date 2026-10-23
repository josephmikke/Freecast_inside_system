import { CreateScheduleCommand, DeleteScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';

import AtExpression from '../valueObjects/AtExpression';

import { IScheduler } from './IScheduler';
import { SchedulerError } from './SchedulerError';

export interface Target {
  RoleArn: string;
  Arn: string;
  Input: string;
}

export default class OneTimeScheduleAdaptor implements IScheduler<Target> {
  constructor(private readonly client: SchedulerClient) {
  }

  async schedule(
    name: string,
    scheduleExpression: AtExpression,
    timezone: string,
    target: Target,
  ): Promise<boolean> {
    try {
      const command = new CreateScheduleCommand({
        Name: name,
        FlexibleTimeWindow: {
          Mode: 'OFF',
        },
        ScheduleExpression: scheduleExpression.value(),
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
      if (e.name === 'ResourceNotFoundException') {
        return false; // already deleted
      }
      throw new SchedulerError.UnableToDeleteSchedule(e);
    }
  }
}
