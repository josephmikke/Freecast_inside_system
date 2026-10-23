import { evaluateXPath, evaluateXPathToString } from 'fontoxpath';
import { DOMParser } from 'xmldom';

import { GenericObject } from '../IParser';

import { IXMLPath } from './IXMLPath';

export default class XMLPathAdaptor implements IXMLPath<GenericObject> {
  private isPathNull(path: string): Boolean {
    return !path;
  }

  toXMlObject(payload: string, mapping: string): Array<GenericObject> {
    const xml = new DOMParser().parseFromString(payload);

    const returnObject = evaluateXPath(mapping, xml);

    if (returnObject instanceof Array) {
      return returnObject;
    }
    const returnArray: Array<GenericObject> = [];
    returnArray.push(returnObject);
    return returnArray;
  }

  select(epg: GenericObject, path: string): string {
    if (this.isPathNull(path)) {
      return '';
    }

    return evaluateXPathToString(path, epg);
  }
}
