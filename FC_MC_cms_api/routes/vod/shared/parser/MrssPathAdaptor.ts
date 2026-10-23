import { evaluateXPathToArray, evaluateXPathToMap, evaluateXPathToStrings } from 'fontoxpath';

import { GenericObject } from '../../../epg/shared/IParser';
import XMLPathAdaptor from '../../../epg/shared/xml/XMLPathAdaptor';

import { IMrssPath } from './IMrssPath';

export default class MrssPathAdaptor extends XMLPathAdaptor implements IMrssPath<GenericObject> {
  selectStrings(entity: GenericObject, pathExpression: string): string[] {
    if (!pathExpression) {
      return [];
    }

    return evaluateXPathToStrings(pathExpression, entity);
  }

  selectMap(entity: GenericObject, pathExpression: string): Object {
    if (!pathExpression) {
      return {};
    }

    return evaluateXPathToMap(pathExpression, entity);
  }

  selectArray(entity: GenericObject, pathExpression: string): GenericObject[] {
    if (!pathExpression) {
      return [];
    }

    return evaluateXPathToArray(pathExpression, entity);
  }
}
