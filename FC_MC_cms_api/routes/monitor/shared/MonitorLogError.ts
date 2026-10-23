export class MonitorLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitorLogError';
  }
}