export interface IEventInvoker<T, U, S> {
  invoke(event: T, eventInput: U): Promise<S>
}
