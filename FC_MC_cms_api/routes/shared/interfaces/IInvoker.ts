export interface IInvoker<T, U, S> {
  handler(event: T, context: U): Promise<S>
}
