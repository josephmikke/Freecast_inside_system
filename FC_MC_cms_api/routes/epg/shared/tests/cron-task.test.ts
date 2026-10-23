import CronTask from '../../../shared/valueObjects/CronTask';

describe('Cron Task Value Object', () => {
  it('should compare two different cron tasks and return false', () => {
    const cronTask1 = new CronTask('0 5 8-14 * *');
    const cronTask2 = new CronTask('0 4 8-14 * *');

    expect(cronTask1.equals(cronTask2)).toBeFalsy();
  });

  it('should compare two similar cron tasks and return true', () => {
    const cronTask1 = new CronTask('0 5 8-14 * *');
    const cronTask2 = new CronTask('0 5 8-14 * *');

    expect(cronTask1.equals(cronTask2)).toBeTruthy();
  });

  it('should accept AWS Event Bridge format', () => {
    const cronTask = new CronTask('0 8 ? 1-12 1-7 *', 'aws-cloud-watch');
    expect(cronTask.value()).toEqual('0 8 ? 1-12 1-7 *');
  });

  it('should throw an error', () => {
    expect(() => new CronTask('0 8 ? 1-12 1-7 *')).toThrow("Expected 5 values, but got 6. (Input cron: '0 8 ? 1-12 1-7 *')");
  });
});
