import EPGTemplate from '../../epgTemplate/shared/EPGTemplate';
import { EPGDto } from '../../shared/dto/EPGDto';
import Asset from '../../shared/interfaces/Asset';
import { ValueObject } from '../../shared/interfaces/ValueObject';
import CronTask from '../../shared/valueObjects/CronTask';
import Thumbnail from '../../shared/valueObjects/Thumbnail';

import { EPGProgram } from './IParser';

export default class EPG extends Asset {
  public readonly name: string;

  public epgTemplate!: EPGTemplate;

  public programs: EPGProgram[];

  public readonly ingestionSchedule: CronTask;

  public readonly timezone: string;

  public thumbnail: ValueObject<Thumbnail>;

  public readonly ingestionUrl: string;

  private constructor(props: Required<Omit<EPGDto, 'id'>>, id: string) {
    super(props, id);
    this.name = props.name;
    this.ingestionSchedule = typeof props.ingestionSchedule !== 'string'
      ? props.ingestionSchedule : new CronTask(props.ingestionSchedule, 'aws-cloud-watch');
    this.timezone = props.timezone;
    this.thumbnail = new Thumbnail(props.thumbnail);
    this.ingestionUrl = props.ingestionUrl;
    this.programs = [];
  }

  addEPGTemplate(template: EPGTemplate) {
    this.epgTemplate = template;
    return this;
  }

  addEPGPrograms(programs: EPGProgram[]) {
    this.programs = this.programs.concat(programs);
    return this;
  }

  updateThumbnail(path: string) {
    this.thumbnail = new Thumbnail(path);
  }

  static create(props: Required<Omit<EPGDto, 'id'>>, id: string): EPG {
    return new EPG(props, id);
  }
}
