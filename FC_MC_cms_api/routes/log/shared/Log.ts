import { LogDto } from '../../shared/dto/LogDto';
import Asset from '../../shared/interfaces/Asset';

export default class Log extends Asset {
  public readonly event: string;

  public readonly entity: string;

  public readonly entityId?: string;

  public readonly user?: string;

  private constructor(props: Required<Omit<LogDto, 'id'>>, id: string) {
    super(props, id);
    this.event = props.event;
    this.entity = props.entity;
    this.entityId = props.entityId;
    this.user = props.user;
  }

  static create(props: Required<Omit<LogDto, 'id'>>, id: string): Log {
    return new Log(props, id);
  }
}
