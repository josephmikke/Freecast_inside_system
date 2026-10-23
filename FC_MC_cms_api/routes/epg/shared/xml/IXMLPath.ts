export interface IXMLPath<T> {
  toXMlObject(payload: string, mapping: string): Array<T>;
  select(entity: T, pathExpression: string): string;
}
