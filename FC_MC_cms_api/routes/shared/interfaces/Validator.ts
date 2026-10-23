export interface Validator<T> {
  isValid(value: T): boolean;
}
