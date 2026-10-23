type Props = {
  createdAt: string;
  updatedAt: string;
  extId: string;
  enabled: boolean;
};

export default abstract class Asset {
  public readonly id: string;

  public readonly extId: string;

  public readonly createdAt: string;

  public readonly updatedAt: string;

  public enabled: boolean;

  protected constructor(props: Props, id: string) {
    this.id = id;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.extId = props.extId;
    this.enabled = props.enabled;
  }
}
