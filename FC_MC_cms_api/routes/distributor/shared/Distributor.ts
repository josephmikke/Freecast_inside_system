import { DistributorDto } from '../../shared/dto/DistributorDto';

type DistributorType = {
  name: string;
  slug: string;
  payoutFlag: boolean;
} | null;

export type DistributorTags = {
  id: number;
  affiliate: string;
  customAffiliateTag: string;
  customAffiliateUrl: string;
};

export default class Distributor {
  public readonly id: number;

  public readonly name: string;

  public readonly code: string;

  public readonly type: DistributorType;

  public readonly customAffiliateTags: Array<DistributorTags>;

  private constructor(props: DistributorDto) {
    this.id = props.id;
    this.name = props.name;
    this.code = props.code;
    this.type = props.type
      ? { name: props.type.name, slug: props.type.slug, payoutFlag: props.type.payout_flag }
      : props.type;
    this.customAffiliateTags = props.custom_affiliate_tags.map(
      (affiliateTag) => ({
        id: affiliateTag.id,
        affiliate: affiliateTag.affiliate,
        customAffiliateTag: affiliateTag.custom_affiliate_tag,
        customAffiliateUrl: affiliateTag.custom_affiliate_url,
      }),
    );
  }

  static create(props: DistributorDto): Distributor {
    return new Distributor(props);
  }
}
