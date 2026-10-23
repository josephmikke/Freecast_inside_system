import { EPGProgram } from '../../epg/shared/IParser';
import { RecordingDto, RecordingStatus } from '../../shared/dto/RecordingDto';
import Asset from '../../shared/interfaces/Asset';
import DashDestination from '../../shared/valueObjects/DashDestination';
import HlsDestination from '../../shared/valueObjects/HlsDestination';

// `startTime` is optional on the DTO and unused by the entity, so it is excluded
// from the Required<> wrapper that makes every other field mandatory.
type RecordingCreateProps = Required<Omit<RecordingDto, 'id' | 'startTime'>>
  & Pick<RecordingDto, 'startTime'>;

export default class Recording extends Asset {
  public channel: string;

  public program: EPGProgram;

  public readonly username: string;

  public readonly status: RecordingStatus;

  public readonly dashStatus: RecordingStatus;

  public readonly hlsStatus: RecordingStatus;

  public readonly destination: {
    hls: HlsDestination,
    dash: DashDestination
  };

  public failureReason?: string;

  private constructor(props: RecordingCreateProps, id: string) {
    super(props, id);
    this.channel = props.channel;
    this.program = props.program as EPGProgram;
    this.username = props.username;
    this.status = props.status;
    this.dashStatus = props.dashStatus;
    this.hlsStatus = props.hlsStatus;
    this.destination = {
      hls: new HlsDestination(props.destination.hls),
      dash: new DashDestination(props.destination.dash),
    };
    this.failureReason = props.failureReason;

    if (this.failureReason.length === 0) delete this.failureReason;
  }

  static create(props: RecordingCreateProps, id: string): Recording {
    return new Recording(props, id);
  }
}
