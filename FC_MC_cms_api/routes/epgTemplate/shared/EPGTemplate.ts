import { EPGTemplateDto, EpgTemplateType } from '../../shared/dto/EPGTemplateDto';
import Asset from '../../shared/interfaces/Asset';

export default class EPGTemplate extends Asset {
  public readonly name: string;

  public readonly mapping: Object;

  public readonly templateType: EpgTemplateType;

  private constructor(props: Required<Omit<EPGTemplateDto, 'id'>>, id: string) {
    super(props, id);
    this.name = props.name;
    this.mapping = props.mapping;
    this.templateType = props.templateType;
  }

  static create(props: Required<Omit<EPGTemplateDto, 'id'>>, id: string): EPGTemplate {
    return new EPGTemplate(props, id);
  }
}
