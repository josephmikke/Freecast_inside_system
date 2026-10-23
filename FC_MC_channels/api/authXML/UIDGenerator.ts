import { randomBytes } from 'crypto';
import { UID } from './IAuthXML';

export default class UIDGenerator implements UID {
  generate(size: number): string {
    return randomBytes(size).toString('hex');
  }
}
