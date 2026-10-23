export type BrandDto = {
  slug: string;
  name: string;
  domain: string;
  active: boolean;
  site_id: number;
  logo_image: string;
  logo_image_dark: string;
};

export type BrandResponseDto = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<BrandDto>;
};
