import { StreamDto, StreamFormat, StreamType } from '../../shared/dto/StreamDto';
import Asset from '../../shared/interfaces/Asset';

type OmittedStreamProps = Omit<StreamDto, 'id'>;

export default class Stream extends Asset {
  public readonly extId: string;

  public readonly name: string;

  public readonly type: StreamType;

  public readonly format: StreamFormat;

  public readonly data: string;

  public readonly daiParams: boolean;

  public readonly weight: number;

  private constructor(props: Required<OmittedStreamProps>, id: string) {
    super(props, id);
    this.extId = props.extId;
    this.name = props.name;
    this.type = props.type;
    this.format = props.format;
    this.data = props.data;
    this.daiParams = props.daiParams;
    this.weight = props.weight;
  }

  static create(props: Required<OmittedStreamProps>, id: string): Stream {
    return new Stream(props, id);
  }
}
