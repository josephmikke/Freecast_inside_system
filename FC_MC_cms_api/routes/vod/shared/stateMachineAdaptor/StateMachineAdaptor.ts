// eslint-disable-next-line max-classes-per-file
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

import { IStateMachineAdaptor } from './IStateMachineAdaptor';

export namespace StateMachineError {
  export class UnableToStartExecution extends Error {
  }
}

export class StateMachineAdaptor implements IStateMachineAdaptor {
  constructor(
    private readonly sfnClient: SFNClient,
    private readonly stateMachineArn: string,
  ) {}

  async startExecution(name: string, input: any): Promise<boolean> {
    try {
      return !!await this.sfnClient.send(new StartExecutionCommand({
        input: JSON.stringify(input),
        name,
        stateMachineArn: this.stateMachineArn,
      }));
    } catch (e) {
      throw new StateMachineError.UnableToStartExecution(e);
    }
  }
}
