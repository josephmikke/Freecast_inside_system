import AtExpression from '../valueObjects/AtExpression';
import CronTask from '../valueObjects/CronTask';

export interface IScheduler<T> {
  schedule(name: string, scheduleExpression: CronTask | AtExpression,
    timezone: string, target: T): Promise<boolean>
  removeSchedule(name: string): Promise<boolean>
}
