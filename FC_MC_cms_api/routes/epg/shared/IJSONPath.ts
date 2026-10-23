export interface IJSONPath<T> {
  query(obj: T, pathExpression: string, count?: number): Array<T>,
  value<U>(obj: T, pathExpression: string): U
}
