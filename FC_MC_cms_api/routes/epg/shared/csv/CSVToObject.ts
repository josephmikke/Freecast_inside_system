import { parse } from 'papaparse';

import { GenericObject } from '../IParser';

import { ICSVToObject } from './ICSVToObject';

export default class CSVToObject implements ICSVToObject<GenericObject> {
  toObjectArray(payload: string): Array<GenericObject> {
    const parsed = parse(payload, { header: true, skipEmptyLines: true });
    return <Array<GenericObject>> parsed.data;
  }
}
