export interface ValueObject<T> {
  value(): string;
  equals(other: T): boolean;
}
