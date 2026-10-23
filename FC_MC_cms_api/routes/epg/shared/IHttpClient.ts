export interface IHttpClient<T> {
  get(url: string): Promise<T>
}
