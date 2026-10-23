import { IXMLPath } from '../../../epg/shared/xml/IXMLPath';

export interface IMrssPath<T> extends IXMLPath<T> {
  selectMap(entity: T, pathExpression: string): Object;
  selectStrings(entity: T, pathExpression: string): string[];
  selectArray(entity: T, pathExpression: string): T[];
}
