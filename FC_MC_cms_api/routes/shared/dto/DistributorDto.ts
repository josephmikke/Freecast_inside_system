export type DistributorDtoType = {
  name: string;
  slug: string;
  payout_flag: boolean;
} | null;

export type DistributorDtoTags = {
  id: number;
  affiliate: string;
  custom_affiliate_tag: string;
  custom_affiliate_url: string;
};

export type DistributorDto = {
  id: number;
  name: string;
  code: string;
  type: DistributorDtoType;
  custom_affiliate_tags: Array<DistributorDtoTags>;
};
