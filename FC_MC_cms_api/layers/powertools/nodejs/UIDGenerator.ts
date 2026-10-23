import { randomBytes } from 'crypto';

export interface UID {
  generate(size: number): string
}

export default class UIDGenerator implements UID {
  private readonly generator;

  constructor() {
    this.generator = randomBytes;
  }

  get Generator() {
    return this.generator;
  }

  generate(size: number): string {
    return this.Generator(size).toString('hex');
  }
}
