export interface IRuleTransfomer<Input, Output> {
  transform(rule: Input): Promise<Output> | Output
}
