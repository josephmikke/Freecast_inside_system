export interface ICSVToObject<T> {
  toObjectArray(payload: string): Array<T>
}
