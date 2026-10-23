export interface IngestionScheduleFrontSide {
  type: 'hourly' | 'daily' | 'weekly';
  hour: string;
  days?: string[];
}

export function fromFrontToBack(
  ingestionScheduleFrontSide: IngestionScheduleFrontSide,
): string {
  const { type, hour, days } = ingestionScheduleFrontSide;
  switch (type) {
    case 'hourly':
      return `0 ${hour} * * ? *`;
    case 'daily':
      return `${30} ${hour} * * ? *`;
    case 'weekly':
      return `${30} ${hour} ? * ${days?.join(',')} *`;
    default:
      return '';
  }
}
