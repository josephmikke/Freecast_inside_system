export interface IRuleGroup<T, U> {
  create(name: string, rules: T): Promise<string>;
  update(name: string, rules: T): Promise<string>;
  exists(name: string): Promise<U>;
  delete(name: string): Promise<boolean>;
}
