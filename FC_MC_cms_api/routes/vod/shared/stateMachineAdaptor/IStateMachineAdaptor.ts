export interface IStateMachineAdaptor {
  startExecution(name: string, input: any): Promise<boolean>
}
