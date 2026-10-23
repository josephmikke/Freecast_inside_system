import { AutoIngestionDto } from '../../shared/dto/AutoIngestionDto';

export type AutoIngestionProps = Required<Omit<AutoIngestionDto, 'id'>>;

export default class AutoIngestion {
  public readonly id: string;

  public readonly createdAt: string;

  public readonly updatedAt: string;

  public readonly enabled: boolean;

  public readonly providerID: string;

  public readonly package_ids: string[];

  public readonly platform_ids: string[];

  public readonly mrss_feed: string;

  public readonly schedule: string;

  public readonly timezone: string;

  public readonly ingestion_ids: string[];

  public readonly scheduler_id: string;

  private constructor(props: AutoIngestionProps, id: string) {
    this.id = id;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.enabled = props.enabled;
    this.providerID = props.providerID;
    this.package_ids = props.package_ids;
    this.platform_ids = props.platform_ids;
    this.mrss_feed = props.mrss_feed;
    this.schedule = props.schedule;
    this.timezone = props.timezone;
    this.ingestion_ids = props.ingestion_ids;
    this.scheduler_id = props.scheduler_id;
  }

  static create(props: AutoIngestionProps, id: string): AutoIngestion {
    return new AutoIngestion(props, id);
  }
}
