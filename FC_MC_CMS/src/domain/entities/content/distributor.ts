interface DistributorResult {
  id: number;
  name: string;
  type: {
    name: string;
    slug: string;
    payoutFlag: boolean;
  };
  customAffiliateTags: {
    id: number;
    affiliate: string;
    customAffiliateTag: string;
    customAffiliateUrl: string;
  }[];
}

// eslint-disable-next-line import/prefer-default-export
export type { DistributorResult };
