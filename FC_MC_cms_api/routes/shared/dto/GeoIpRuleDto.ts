import { Event } from '@middy/http-json-body-parser';

import Cidr from '../valueObjects/CIDR';
import CountryCode from '../valueObjects/CountryCode';

export enum GeoIpRulePolicyType {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
}

export enum GeoIpRuleType {
  CIDR = 'CIDR',
  USER_AGENT = 'USER_AGENT',
  LOCATION = 'LOCATION',
}

export type GeoIpRuleRequestDto = {
  name: string;
  description: string;
  packages: string[];
  policyType: GeoIpRulePolicyType;
  ruleType: GeoIpRuleType;
  value: string;
};

export type GeoIpRuleDto = {
  id?: string;
  extId?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
  weight: number;
  value: Cidr | CountryCode | string;
} & Omit<GeoIpRuleRequestDto, 'value'>;

export type AddGeoIpRuleEvent = {
  body: GeoIpRuleRequestDto
} & Event;

export type DeleteGeoIpRuleEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type GeoIpRuleQueryParameters = {
  limit?: string;
  nextToken?: string;
};

export type GetGeoIpRulesEvent = {
  queryStringParameters: GeoIpRuleQueryParameters;
} & Event;

export type GeoIpRuleParameters = {
  limit?: number;
  nextToken?: string;
};

export type UpdateGeoIpRuleWeightEvent = {
  pathParameters: {
    id: string;
    index: string;
  }
} & Event;

export type UpdateGeoIpRuleEnabledEvent = {
  body: {
    enabled: boolean;
  },
  pathParameters: {
    id: string;
  }
} & Event;
