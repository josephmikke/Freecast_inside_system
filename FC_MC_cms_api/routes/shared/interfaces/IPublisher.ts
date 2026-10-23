export interface IPublisher<T> {
  publish(event: T): Promise<boolean>
}
