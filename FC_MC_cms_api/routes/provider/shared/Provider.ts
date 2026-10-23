import { ProviderContentType, ProviderDto, ProviderNumberFormat } from '../../shared/dto/ProviderDto';
import Asset from '../../shared/interfaces/Asset';

export default class Provider extends Asset {
  public readonly name: string;

  public readonly extId: string;

  public readonly configuration: Object;

  public readonly type: Array<ProviderContentType>;

  public readonly subscription: boolean;

  public readonly format: ProviderNumberFormat;

  public readonly mtSlug: string;

  public readonly hlsMtSlug: string;

  public readonly aidSlug: string;

  private constructor(props: Omit<ProviderDto, 'id'>, id: string) {
    super(props, id);
    this.name = props.name;
    this.extId = props.extId;
    this.configuration = props.configuration;
    this.type = props.type;
    this.subscription = props.subscription;
    this.format = props.format;
    this.mtSlug = props.mtSlug ?? '';
    this.hlsMtSlug = props.hlsMtSlug ?? '';
    this.aidSlug = props.aidSlug ?? '';
  }

  static create(props: Omit<ProviderDto, 'id'>, id: string): Provider {
    return new Provider(props, id);
  }
}
